'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { TEAMS, WEEK_DATES, getMatchPairs, getTeam, calcMatchPoints } from '@/lib/league-data'

type Tab = 'matches' | 'teams' | 'notify'
type MatchRow = any

export default function CommissionerPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [tab, setTab] = useState<Tab>('matches')
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [filterWeek, setFilterWeek] = useState(6)
  const [notifyWeek, setNotifyWeek] = useState(6)
  const [notifyStatus, setNotifyStatus] = useState('')
  const [editMatch, setEditMatch] = useState<MatchRow | null>(null)
  const [editScoresA, setEditScoresA] = useState<(number|null)[]>(Array(9).fill(null))
  const [editScoresB, setEditScoresB] = useState<(number|null)[]>(Array(9).fill(null))

  async function login() {
    const res = await fetch('/api/auth/commissioner', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (res.ok) { setAuthed(true); loadData() }
    else setLoginErr('Invalid credentials')
  }

  async function loadData() {
    const sb = createBrowserClient()
    const [{ data: m }, { data: t }] = await Promise.all([
      sb.from('matches').select('*').order('week').order('team_a'),
      sb.from('teams').select('*').order('id')
    ])
    setMatches(m || [])
    setTeams(t || [])
  }

  function weekMatches() {
    return getMatchPairs(filterWeek).map(({ teamA, teamB }) => {
      const m = matches.find(x =>
        (x.team_a===teamA&&x.team_b===teamB)||(x.team_a===teamB&&x.team_b===teamA))
      return { teamA, teamB, match: m }
    })
  }

  async function unlockMatch(match: MatchRow) {
    const sb = createBrowserClient()
    await sb.from('matches').update({ status: 'partial', pts_a: null, pts_b: null }).eq('id', match.id)
    loadData()
  }

  async function openEdit(match: MatchRow) {
    setEditMatch(match)
    setEditScoresA(match.scores_a || Array(9).fill(null))
    setEditScoresB(match.scores_b || Array(9).fill(null))
  }

  async function saveEdit() {
    if (!editMatch) return
    const complete = editScoresA.every(s=>s!==null) && editScoresB.every(s=>s!==null)
    let ptsA = null, ptsB = null, status = 'partial'
    if (complete) {
      const r = calcMatchPoints(editScoresA as number[], editScoresB as number[])
      ptsA = r.ptsA; ptsB = r.ptsB; status = 'locked'
    }
    const sb = createBrowserClient()
    await sb.from('matches').upsert({
      id: editMatch.id || undefined,
      week: editMatch.week, team_a: editMatch.team_a, team_b: editMatch.team_b,
      scores_a: editScoresA, scores_b: editScoresB,
      pts_a: ptsA, pts_b: ptsB,
      submitted_a: true, submitted_b: true, status,
      updated_at: new Date().toISOString()
    })
    setEditMatch(null)
    loadData()
  }

  async function sendNotify(type: string) {
    setNotifyStatus('Sending...')
    const res = await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: notifyWeek, type })
    })
    const j = await res.json()
    setNotifyStatus(res.ok ? `Sent ${j.sent?.length || 0} messages` : 'Error: ' + j.error)
  }

  if (!authed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-lg font-medium mb-4">Commissioner login</h1>
        <input className="input mb-2" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input mb-3" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&login()} />
        {loginErr && <p className="text-xs text-red-600 mb-2">{loginErr}</p>}
        <button className="btn-primary" onClick={login}>Log in</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-medium">Commissioner</h1>
            <a href="/" className="text-xs text-gray-400 underline">View league</a>
          </div>
          <nav className="flex border-b border-gray-100">
            {(['matches','teams','notify'] as Tab[]).map(t => (
              <button key={t} onClick={()=>setTab(t)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px ${tab===t?'border-brand text-brand':'border-transparent text-gray-400'}`}>
                {t}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* ── Matches ── */}
        {tab === 'matches' && (
          <div>
            <div className="flex gap-2 flex-wrap mb-3">
              {Array.from({length:15},(_,i)=>i+1).map(w=>(
                <button key={w} onClick={()=>setFilterWeek(w)}
                  className={`px-3 py-1 rounded-full text-xs border ${filterWeek===w?'bg-brand text-white border-brand':'border-gray-200 text-gray-500 bg-white'}`}>
                  Wk {w}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Week {filterWeek} — {WEEK_DATES[filterWeek-1]}</p>
            {weekMatches().map(({teamA, teamB, match}) => (
              <div key={`${teamA}-${teamB}`} className="card mb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{getTeam(teamA).short} vs {getTeam(teamB).short}</p>
                    {match?.status === 'locked' && (
                      <p className="text-xs text-gray-500 mt-0.5">{match.pts_a} — {match.pts_b} pts</p>
                    )}
                    <div className="mt-1.5 flex gap-1.5 flex-wrap">
                      {!match && <span className="badge-gray">not started</span>}
                      {match?.status==='partial' && <span className="badge-amber">{match.submitted_a&&!match.submitted_b?'waiting on '+getTeam(teamB).short:!match.submitted_a&&match.submitted_b?'waiting on '+getTeam(teamA).short:'partial'}</span>}
                      {match?.status==='locked' && <span className="badge-green">locked</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>openEdit(match || {week:filterWeek,team_a:teamA,team_b:teamB,scores_a:null,scores_b:null,status:'pending'})}
                      className="text-xs text-brand underline">Edit</button>
                    {match?.status==='locked' && (
                      <button onClick={()=>unlockMatch(match)} className="text-xs text-red-500 underline">Unlock</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Teams ── */}
        {tab === 'teams' && (
          <div>
            <p className="text-xs text-gray-500 mb-3">Each team's unique link for score entry. Text these to team captains at the start of the season.</p>
            {teams.map(t => (
              <div key={t.id} className="card mb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{t.short_name}</p>
                    <p className="text-xs text-gray-400">{t.player1} · {t.player2}</p>
                    <p className="text-xs text-gray-400">{t.phone1}{t.phone2 ? ' · ' + t.phone2 : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 mb-1">Team link</p>
                    <button onClick={() => {
                      const url = `${window.location.origin}/team/${t.token}`
                      navigator.clipboard.writeText(url)
                      alert('Copied: ' + url)
                    }} className="text-xs text-brand underline">Copy link</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Notify ── */}
        {tab === 'notify' && (
          <div>
            <div className="card mb-4">
              <p className="text-sm font-medium mb-3">Send week reminders</p>
              <p className="text-xs text-gray-500 mb-2">Texts both players on every team with their matchup and score-entry link.</p>
              <div className="flex gap-2 mb-3">
                <select className="input flex-1" value={notifyWeek} onChange={e=>setNotifyWeek(parseInt(e.target.value))}>
                  {Array.from({length:15},(_,i)=>i+1).map(w=>(
                    <option key={w} value={w}>Week {w} — {WEEK_DATES[w-1]}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary mb-2" onClick={()=>sendNotify('week-reminder')}>
                Send week {notifyWeek} reminders
              </button>
              <button className="btn-secondary" onClick={()=>sendNotify('makeup-reminder')}>
                Send makeup reminders (unplayed weeks before wk {notifyWeek})
              </button>
              {notifyStatus && <p className="text-xs text-gray-500 mt-2 text-center">{notifyStatus}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editMatch && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium">
                Edit: {getTeam(editMatch.team_a).short} vs {getTeam(editMatch.team_b).short} · Wk {editMatch.week}
              </p>
              <button onClick={()=>setEditMatch(null)} className="text-gray-400">✕</button>
            </div>
            {['a','b'].map(side => (
              <div key={side} className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">{getTeam(side==='a'?editMatch.team_a:editMatch.team_b).short}</p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length:9},(_,i)=>{
                    const scores = side==='a' ? editScoresA : editScoresB
                    const setScores = side==='a' ? setEditScoresA : setEditScoresB
                    return (
                      <div key={i} className="border border-gray-100 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-400">H{i+1}</p>
                        <input type="number" min={1} max={15}
                          value={scores[i]??''}
                          onChange={e=>{const n=parseInt(e.target.value);setScores(s=>{const c=[...s];c[i]=isNaN(n)||n<1?null:n;return c})}}
                          className="w-full text-center text-base font-medium bg-transparent border-none outline-none" />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button className="btn-secondary flex-1" onClick={()=>setEditMatch(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={saveEdit}>Save & lock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
