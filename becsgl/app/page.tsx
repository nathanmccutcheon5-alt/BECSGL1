'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { TEAMS, WEEK_DATES, getMatchPairs, getTeam } from '@/lib/league-data'

type Standing = { id: number; short: string; pts: number; played: number; avg: number }
type MatchRow = { week: number; teamA: number; teamB: number; ptsA: number | null; ptsB: number | null; status: string }

type Tab = 'standings' | 'results' | 'schedule'

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('standings')
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [schedWeek, setSchedWeek] = useState(1)
  const [resultsWeek, setResultsWeek] = useState(5)

  useEffect(() => {
    const sb = createBrowserClient()
    sb.from('matches').select('*').then(({ data }) => {
      if (!data) return
      const rows = data as any[]
      setMatches(rows.map(r => ({
        week: r.week, teamA: r.team_a, teamB: r.team_b,
        ptsA: r.pts_a, ptsB: r.pts_b, status: r.status
      })))
      const pts: Record<number, { pts: number; played: number }> = {}
      TEAMS.forEach(t => { pts[t.id] = { pts: 0, played: 0 } })
      rows.filter(r => r.status === 'locked').forEach(r => {
        if (r.pts_a != null) { pts[r.team_a].pts += r.pts_a; pts[r.team_a].played++ }
        if (r.pts_b != null) { pts[r.team_b].pts += r.pts_b; pts[r.team_b].played++ }
      })
      const s: Standing[] = TEAMS.map(t => ({
        id: t.id, short: t.short,
        pts: pts[t.id].pts, played: pts[t.id].played,
        avg: pts[t.id].played ? pts[t.id].pts / pts[t.id].played : 0
      })).sort((a, b) => b.pts - a.pts || b.avg - a.avg)
      setStandings(s)
    })
  }, [])

  const weekMatches = (week: number) => matches.filter(m => m.week === week)
  const ranks = ['1st', '2nd', '3rd', '4th']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-medium">BECSGL 2026</h1>
              <p className="text-xs text-gray-500">Boeing Employee Classic Scratch Golf League</p>
            </div>
            <a href="/commissioner" className="text-xs text-gray-400 underline">Commissioner</a>
          </div>
          <nav className="flex border-b border-gray-100">
            {(['standings','results','schedule'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${tab===t ? 'border-brand text-brand' : 'border-transparent text-gray-400'}`}>
                {t}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* ── Standings ── */}
        {tab === 'standings' && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-3">
                <p className="text-xs text-gray-500 mb-1">Season week</p>
                <p className="text-2xl font-medium">6 <span className="text-sm text-gray-400">of 15</span></p>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-3">
                <p className="text-xs text-gray-500 mb-1">Teams</p>
                <p className="text-2xl font-medium">20</p>
              </div>
            </div>
            <div className="card divide-y divide-gray-50">
              {standings.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-medium text-gray-400 w-6 shrink-0">{ranks[i] ?? i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-medium text-brand-dark shrink-0">
                    {t.short.split('/').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.short}</p>
                    <p className="text-xs text-gray-400">{t.played} played · {t.avg.toFixed(1)} avg</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{t.pts}</p>
                    <p className="text-xs text-gray-400">pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {tab === 'results' && (
          <div>
            <div className="flex gap-2 flex-wrap mb-3">
              {Array.from({ length: 15 }, (_, i) => i + 1).map(w => (
                <button key={w} onClick={() => setResultsWeek(w)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${resultsWeek===w ? 'bg-brand text-white border-brand' : 'border-gray-200 text-gray-500 bg-white'}`}>
                  Wk {w}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Week {resultsWeek} — {WEEK_DATES[resultsWeek-1]}</p>
            <div className="card divide-y divide-gray-50">
              {getMatchPairs(resultsWeek).map(({ teamA, teamB }) => {
                const m = weekMatches(resultsWeek).find(x =>
                  (x.teamA===teamA && x.teamB===teamB)||(x.teamA===teamB && x.teamB===teamA))
                const pA = m?.teamA===teamA ? m.ptsA : m?.ptsB
                const pB = m?.teamA===teamA ? m.ptsB : m?.ptsA
                const locked = m?.status === 'locked'
                return (
                  <div key={`${teamA}-${teamB}`} className="flex items-center justify-between py-2.5 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getTeam(teamA).short}</p>
                      <p className="text-xs text-gray-400">vs {getTeam(teamB).short}</p>
                    </div>
                    {locked && pA != null && pB != null ? (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{pA} — {pB}</p>
                        <span className={`badge-${pA>pB?'green':pA<pB?'gray':'amber'} text-xs`}>
                          {pA>pB?'W':pA<pB?'L':'T'}
                        </span>
                      </div>
                    ) : (
                      <span className="badge-gray text-xs">pending</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Schedule ── */}
        {tab === 'schedule' && (
          <div>
            <div className="flex gap-2 flex-wrap mb-3">
              {Array.from({ length: 15 }, (_, i) => i + 1).map(w => (
                <button key={w} onClick={() => setSchedWeek(w)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${schedWeek===w ? 'bg-brand text-white border-brand' : 'border-gray-200 text-gray-500 bg-white'}`}>
                  Wk {w}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Week {schedWeek} — {WEEK_DATES[schedWeek-1]}</p>
            {schedWeek === 9 ? (
              <div className="card text-center text-sm text-gray-500 py-6">Catch-up / holiday week — no scheduled matches</div>
            ) : (
              <div className="card divide-y divide-gray-50">
                {getMatchPairs(schedWeek).map(({ teamA, teamB }) => (
                  <div key={`${teamA}-${teamB}`} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{getTeam(teamA).short}</p>
                      <p className="text-xs text-gray-400">vs {getTeam(teamB).short}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
