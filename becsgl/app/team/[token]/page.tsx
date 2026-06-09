'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { getTeam, getOpponent, WEEK_DATES, TOTAL_WEEKS, calcMatchPoints, SKIP_WEEKS } from '@/lib/league-data'

type Step = 'loading' | 'not-found' | 'pick-week' | 'holes' | 'waiting' | 'locked'

type MatchRecord = {
  id: string; week: number; team_a: number; team_b: number
  scores_a: number[] | null; scores_b: number[] | null
  pts_a: number | null; pts_b: number | null
  submitted_a: boolean; submitted_b: boolean; status: string
}

export default function TeamPage() {
  const { token } = useParams<{ token: string }>()
  const [step, setStep] = useState<Step>('loading')
  const [teamId, setTeamId] = useState<number | null>(null)
  const [teamName, setTeamName] = useState('')
  const [myMatches, setMyMatches] = useState<MatchRecord[]>([])

  // Score entry state
  const [selWeek, setSelWeek] = useState<number | null>(null)
  const [selMatch, setSelMatch] = useState<MatchRecord | null>(null)
  const [myScores, setMyScores] = useState<(number | null)[]>(Array(9).fill(null))
  const [oppScores, setOppScores] = useState<(number | null)[]>(Array(9).fill(null))
  const [drives, setDrives] = useState<(number | null)[]>(Array(9).fill(null))
  const [submitting, setSubmitting] = useState(false)
  const [lockedMsg, setLockedMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const sb = createBrowserClient()
      const { data: team } = await sb.from('teams').select('id, short_name').eq('token', token).single()
      if (!team) { setStep('not-found'); return }
      setTeamId(team.id)
      setTeamName(team.short_name)

      const { data: matches } = await sb.from('matches')
        .select('*').or(`team_a.eq.${team.id},team_b.eq.${team.id}`)
      setMyMatches((matches || []) as MatchRecord[])
      setStep('pick-week')
    }
    init()
  }, [token])

  function isMyTeamA(match: MatchRecord) { return match.team_a === teamId }

  function getWeekStatus(week: number): 'locked' | 'my-turn' | 'waiting' | 'open' {
    const m = myMatches.find(x => x.week === week)
    if (!m) return 'open'
    if (m.status === 'locked') return 'locked'
    const iAmA = isMyTeamA(m)
    if (iAmA && m.submitted_a) return 'waiting'
    if (!iAmA && m.submitted_b) return 'waiting'
    return 'my-turn'
  }

  function selectWeek(week: number) {
    setSelWeek(week)
    const existing = myMatches.find(x => x.week === week)
    const oppId = getOpponent(teamId!, week)

    if (existing) {
      setSelMatch(existing)
      const iAmA = isMyTeamA(existing)
      setMyScores(iAmA ? (existing.scores_a || Array(9).fill(null)) : (existing.scores_b || Array(9).fill(null)))
      setOppScores(iAmA ? (existing.scores_b || Array(9).fill(null)) : (existing.scores_a || Array(9).fill(null)))
    } else {
      // Create a new pending match record
      const iAmA = teamId! < oppId
      const newMatch: MatchRecord = {
        id: '', week, team_a: iAmA ? teamId! : oppId, team_b: iAmA ? oppId : teamId!,
        scores_a: null, scores_b: null, pts_a: null, pts_b: null,
        submitted_a: false, submitted_b: false, status: 'pending'
      }
      setSelMatch(newMatch)
      setMyScores(Array(9).fill(null))
      setOppScores(Array(9).fill(null))
    }
    setDrives(Array(9).fill(null))
    setError('')
    setStep('holes')
  }

  function setMyScore(i: number, val: string) {
    const n = parseInt(val)
    setMyScores(s => { const c = [...s]; c[i] = isNaN(n) || n < 1 ? null : n; return c })
  }

  function setDrive(i: number, player: number) {
    setDrives(d => { const c = [...d]; c[i] = c[i] === player ? null : player; return c })
  }

  function holePts(i: number): [number, number] {
    const iAmA = selMatch ? isMyTeamA(selMatch) : true
    const a = iAmA ? myScores[i] : oppScores[i]
    const b = iAmA ? oppScores[i] : myScores[i]
    if (a === null || b === null) return [0, 0]
    if (a < b) return [2, 0]
    if (b < a) return [0, 2]
    return [1, 1]
  }

  function myHolePts(i: number) {
    const [a, b] = holePts(i)
    return isMyTeamA(selMatch!) ? a : b
  }

  function summary() {
    let hMe = 0, hOpp = 0, done = 0
    for (let i = 0; i < 9; i++) {
      if (myScores[i] !== null) {
        const [a, b] = holePts(i)
        const mine = isMyTeamA(selMatch!) ? a : b
        hMe += mine; hOpp += (2 - mine === 2 && a !== b ? 2 : 2 - mine)
        done++
      }
    }
    // Recalculate properly
    hMe = 0; hOpp = 0; done = 0
    for (let i = 0; i < 9; i++) {
      if (myScores[i] !== null && oppScores[i] !== null) {
        const iAmA = isMyTeamA(selMatch!)
        const a = iAmA ? myScores[i]! : oppScores[i]!
        const b = iAmA ? oppScores[i]! : myScores[i]!
        if (a < b) hMe += 2; else if (b < a) hOpp += 2; else { hMe++; hOpp++ }
        done++
      }
    }
    let bMe = 0, bOpp = 0
    if (done === 9) {
      if (hMe > hOpp) bMe = 2; else if (hOpp > hMe) bOpp = 2; else { bMe = 1; bOpp = 1 }
    }
    return { hMe, hOpp, bMe, bOpp, done, total: hMe + bMe }
  }

  function driveWarnings(): string[] {
    if (drives.some(d => d === null)) return []
    const counts = [0, 0]
    drives.forEach(d => { if (d === 0) counts[0]++; else if (d === 1) counts[1]++ })
    const team = getTeam(teamId!)
    const warns: string[] = []
    if (counts[0] < 3) warns.push(`${team.player1} has only ${counts[0]} drives (min 3)`)
    if (counts[1] < 3) warns.push(`${team.player2} has only ${counts[1]} drives (min 3)`)
    return warns
  }

  async function submitScores() {
    if (myScores.some(s => s === null)) { setError('Enter all 9 scores for your team first.'); return }
    setSubmitting(true); setError('')
    const iAmA = isMyTeamA(selMatch!)
    const oppId = getOpponent(teamId!, selWeek!)
    const teamA = iAmA ? teamId! : oppId
    const teamB = iAmA ? oppId : teamId!
    const scoresA = iAmA ? myScores as number[] : (selMatch!.scores_a || null)
    const scoresB = iAmA ? (selMatch!.scores_b || null) : myScores as number[]
    const drivesA = iAmA ? drives : selMatch!.drives_a
    const drivesB = iAmA ? selMatch!.drives_b : drives
    const subA = iAmA ? true : selMatch!.submitted_a
    const subB = iAmA ? selMatch!.submitted_b : true

    // Check if both submitted and scores are complete
    const bothIn = subA && subB && scoresA && scoresB
    let ptsA = null, ptsB = null, status = bothIn ? 'locked' : 'partial'
    if (bothIn) {
      const { ptsA: pa, ptsB: pb } = calcMatchPoints(scoresA!, scoresB!)
      ptsA = pa; ptsB = pb
    }

    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token, week: selWeek, teamA, teamB, scoresA, scoresB,
        drivesA, drivesB, subA, subB, ptsA, ptsB, status
      })
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error || 'Something went wrong.'); setSubmitting(false); return }

    if (status === 'locked') {
      const oppName = getTeam(oppId).short
      setLockedMsg(`Match locked! ${teamName} ${ptsA} pts — ${oppName} ${ptsB} pts`)
      setStep('locked')
    } else {
      setStep('waiting')
    }
    setSubmitting(false)
  }

  const oppId = teamId && selWeek ? getOpponent(teamId, selWeek) : null
  const oppTeam = oppId ? getTeam(oppId) : null
  const myTeam = teamId ? getTeam(teamId) : null
  const sum = selMatch ? summary() : null

  if (step === 'loading') return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (step === 'not-found') return <div className="min-h-screen flex items-center justify-center p-4 text-center"><div><p className="text-lg font-medium">Link not found</p><p className="text-sm text-gray-500 mt-1">Check with your commissioner for your team link.</p></div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {(step === 'holes' || step === 'waiting' || step === 'locked') && (
            <button onClick={() => setStep('pick-week')} className="text-brand text-sm">← back</button>
          )}
          <div className="flex-1">
            <p className="text-xs text-gray-400">Entering as</p>
            <p className="text-base font-medium">{teamName}</p>
          </div>
          <a href="/" className="text-xs text-gray-400 underline">League</a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* ── Week picker ── */}
        {step === 'pick-week' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Select a match to enter scores — including makeup weeks.</p>
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1)
              .filter(w => !SKIP_WEEKS.includes(w))
              .map(w => {
                const oppId = getOpponent(teamId!, w)
                const st = getWeekStatus(w)
                return (
                  <button key={w} onClick={() => st !== 'locked' && selectWeek(w)}
                    className={`w-full card mb-2 flex items-center justify-between text-left ${st==='locked'?'opacity-60 cursor-default':''}`}>
                    <div>
                      <p className="text-sm font-medium">Week {w} — {WEEK_DATES[w-1]}</p>
                      <p className="text-xs text-gray-400 mt-0.5">vs {getTeam(oppId).short}</p>
                      <div className="mt-1.5">
                        {st==='locked' && <span className="badge-green">locked</span>}
                        {st==='waiting' && <span className="badge-amber">waiting for opponent</span>}
                        {st==='my-turn' && <span className="badge-blue">enter your scores</span>}
                        {st==='open' && <span className="badge-gray">not started</span>}
                      </div>
                    </div>
                    {st !== 'locked' && <span className="text-gray-300 text-lg">›</span>}
                  </button>
                )
              })}
          </div>
        )}

        {/* ── Hole entry ── */}
        {step === 'holes' && selMatch && oppTeam && myTeam && (
          <div>
            <div className="card mb-3">
              <p className="text-xs text-gray-400 mb-0.5">Week {selWeek} · {WEEK_DATES[selWeek!-1]}</p>
              <p className="text-sm font-medium">{teamName} <span className="text-gray-400 font-normal">vs</span> {oppTeam.short}</p>
            </div>

            {/* My scores */}
            <div className="card mb-3">
              <p className="text-sm font-medium mb-2">Your scores — {teamName}</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => {
                  const mp = myScores[i] !== null && oppScores[i] !== null ? myHolePts(i) : null
                  const cls = mp === null ? '' : mp === 2 ? 'border-green-300 bg-green-50' : mp === 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                  return (
                    <div key={i} className={`border rounded-xl p-2 text-center transition-colors ${cls || 'border-gray-100'}`}>
                      <p className="text-xs text-gray-400">H{i+1}</p>
                      <input type="number" min={1} max={15} value={myScores[i] ?? ''}
                        onChange={e => setMyScore(i, e.target.value)}
                        placeholder="—"
                        className="w-full text-center text-lg font-medium bg-transparent border-none outline-none" />
                      <p className="text-xs h-3.5 mt-0.5">
                        {mp === 2 && <span className="text-green-700">▲ win</span>}
                        {mp === 0 && <span className="text-red-600">▼ lose</span>}
                        {mp === 1 && <span className="text-amber-700">= tie</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Opponent scores — read-only if they already submitted */}
            <div className="card mb-3">
              <p className="text-sm font-medium mb-0.5">Opponent scores — {oppTeam.short}</p>
              <p className="text-xs text-gray-400 mb-2">Enter the scores your opponent shot hole-by-hole.</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => {
                  const alreadyIn = selMatch.status !== 'pending' && (isMyTeamA(selMatch) ? selMatch.submitted_b : selMatch.submitted_a)
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl p-2 text-center">
                      <p className="text-xs text-gray-400">H{i+1}</p>
                      <input type="number" min={1} max={15} value={oppScores[i] ?? ''}
                        onChange={e => {
                          const n = parseInt(e.target.value)
                          setOppScores(s => { const c = [...s]; c[i] = isNaN(n) || n < 1 ? null : n; return c })
                        }}
                        readOnly={alreadyIn}
                        placeholder="—"
                        className={`w-full text-center text-lg font-medium bg-transparent border-none outline-none ${alreadyIn ? 'text-gray-400' : ''}`} />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">Scores must match what your opponent submits before the match locks.</p>
            </div>

            {/* Drive tracker */}
            <div className="card mb-3">
              <p className="text-sm font-medium mb-2">Drive tracker — {teamName}</p>
              <p className="text-xs text-gray-400 mb-2">Tap who drove on each hole. Each player must drive at least 3 times.</p>
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="flex items-center gap-2 py-2">
                    <span className="text-xs text-gray-400 w-7">H{i+1}</span>
                    {[myTeam.player1, myTeam.player2].map((p, pi) => (
                      <button key={pi} onClick={() => setDrive(i, pi)}
                        className={`px-3 py-1 rounded-lg text-xs border transition-colors ${drives[i]===pi ? 'bg-brand-light text-brand-dark border-brand' : 'border-gray-200 text-gray-500'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {driveWarnings().map((w, i) => (
                <p key={i} className="text-xs text-red-600 mt-1">{w}</p>
              ))}
            </div>

            {/* Summary bar */}
            {sum && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400">Hole pts</p>
                  <p className="text-base font-medium">{sum.hMe} : {sum.hOpp}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Match bonus</p>
                  <p className="text-base font-medium">+{sum.bMe} / +{sum.bOpp}</p>
                </div>
              </div>
            )}
            {sum && sum.done === 9 && (
              <p className="text-xs text-center text-gray-500 mb-2">
                {teamName} {sum.total} pts — {oppTeam.short} {18 - sum.total + sum.bOpp + sum.bMe - sum.total + sum.hOpp + sum.bOpp} pts
              </p>
            )}

            {error && <p className="text-xs text-red-600 mb-2 text-center">{error}</p>}
            <button onClick={submitScores} disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit my scores'}
            </button>
          </div>
        )}

        {/* ── Waiting ── */}
        {step === 'waiting' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
            <p className="text-base font-medium mb-2">Scores submitted!</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">Waiting for {oppTeam?.short} to enter their scores. Once both teams submit matching scores, the match will lock automatically.</p>
            <button onClick={() => setStep('pick-week')} className="btn-secondary mt-6 max-w-xs mx-auto">Back to my matches</button>
          </div>
        )}

        {/* ── Locked ── */}
        {step === 'locked' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 text-2xl">✅</div>
            <p className="text-base font-medium mb-2">Match locked!</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">{lockedMsg}</p>
            <a href="/" className="btn-secondary mt-6 max-w-xs mx-auto block">View full standings</a>
            <button onClick={() => setStep('pick-week')} className="btn-secondary mt-2 max-w-xs mx-auto">Back to my matches</button>
          </div>
        )}

      </div>
    </div>
  )
}
