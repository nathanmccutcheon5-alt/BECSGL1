import { NextRequest, NextResponse } from 'next/server'
import { verifyCommissionerToken } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { getOpponent, getTeam, WEEK_DATES } from '@/lib/league-data'
import { sendWeekReminder, sendMakeupReminder } from '@/lib/sms'

export async function POST(req: NextRequest) {
  // Require commissioner auth
  const commToken = req.cookies.get('comm_token')?.value
  if (!commToken || !(await verifyCommissionerToken(commToken))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { week, type } = await req.json()
  // type: 'week-reminder' | 'makeup-reminder'

  const sb = createServiceClient()
  const { data: teams } = await sb.from('teams').select('*')
  const { data: matches } = await sb.from('matches').select('*')

  if (!teams) return NextResponse.json({ error: 'No teams found' }, { status: 500 })

  const sent: string[] = []

  if (type === 'week-reminder') {
    for (const team of teams) {
      const oppId = getOpponent(team.id, week)
      const opp = getTeam(oppId)
      const phones = [team.phone1, team.phone2].filter(Boolean) as string[]
      for (const phone of phones) {
        await sendWeekReminder({
          phone: '+1' + phone.replace(/\D/g, ''),
          teamName: team.short_name, opponentName: opp.short,
          week, weekDate: WEEK_DATES[week - 1], teamToken: team.token
        })
        sent.push(`${team.short_name} → ${phone}`)
      }
    }
  }

  if (type === 'makeup-reminder') {
    // Find teams with unplayed matches from weeks 1 to week-1
    const lockedKeys = new Set((matches || []).filter(m => m.status === 'locked').map(m => `${m.week}-${Math.min(m.team_a,m.team_b)}-${Math.max(m.team_a,m.team_b)}`))

    for (let w = 1; w < week; w++) {
      for (const team of teams) {
        const oppId = getOpponent(team.id, w)
        const key = `${w}-${Math.min(team.id, oppId)}-${Math.max(team.id, oppId)}`
        if (!lockedKeys.has(key)) {
          const phone = team.phone1
          if (phone) {
            await sendMakeupReminder({
              phone: '+1' + phone.replace(/\D/g, ''),
              teamName: team.short_name, opponentName: getTeam(oppId).short,
              week: w, teamToken: team.token
            })
            sent.push(`${team.short_name} makeup wk${w}`)
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
