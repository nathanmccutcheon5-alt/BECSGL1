import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getTeamByToken } from '@/lib/auth'
import { getTeam, WEEK_DATES } from '@/lib/league-data'
import { sendScoreNotification, sendMatchLockedNotification } from '@/lib/sms'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, week, teamA, teamB, scoresA, scoresB, drivesA, drivesB, subA, subB, ptsA, ptsB, status } = body

  // Verify the team token
  const team = await getTeamByToken(token)
  if (!team) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Make sure this team is actually part of this match
  if (team.id !== teamA && team.id !== teamB) {
    return NextResponse.json({ error: 'Not your match' }, { status: 403 })
  }

  const sb = createServiceClient()

  // Upsert the match record
  const { data: match, error } = await sb.from('matches').upsert({
    week, team_a: teamA, team_b: teamB,
    scores_a: scoresA, scores_b: scoresB,
    drives_a: drivesA, drives_b: drivesB,
    pts_a: ptsA, pts_b: ptsB,
    submitted_a: subA, submitted_b: subB,
    status, updated_at: new Date().toISOString()
  }, {
    onConflict: 'week,team_a,team_b',
    ignoreDuplicates: false
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send SMS notifications
  try {
    const isSubmittingA = team.id === teamA
    const oppId = isSubmittingA ? teamB : teamA

    const { data: oppTeamData } = await sb.from('teams').select('phone1, phone2, token').eq('id', oppId).single()

    if (status === 'locked') {
      // Notify both teams the match is locked
      const { data: myTeamData } = await sb.from('teams').select('phone1, phone2').eq('id', team.id).single()
      const phones = [myTeamData?.phone1, myTeamData?.phone2, oppTeamData?.phone1, oppTeamData?.phone2]
        .filter(Boolean) as string[]
      await sendMatchLockedNotification({
        phones: phones.map(p => '+1' + p.replace(/\D/g, '')),
        teamAName: getTeam(teamA).short, teamBName: getTeam(teamB).short,
        ptsA: ptsA!, ptsB: ptsB!, week
      })
    } else if (oppTeamData?.phone1) {
      // Notify opponent that first team has submitted
      await sendScoreNotification({
        phone: '+1' + oppTeamData.phone1.replace(/\D/g, ''),
        submittingTeam: team.short_name,
        waitingTeam: getTeam(oppId).short,
        week, teamToken: oppTeamData.token
      })
    }
  } catch (smsErr) {
    console.error('SMS error (non-fatal):', smsErr)
  }

  return NextResponse.json({ ok: true, match })
}
