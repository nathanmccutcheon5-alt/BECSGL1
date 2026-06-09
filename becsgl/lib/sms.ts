import twilio from 'twilio'

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

export async function sendSMS(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log('[SMS skipped — no Twilio config]', to, body)
    return
  }
  await getClient().messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to, body })
}

export async function sendWeekReminder(opts: {
  phone: string
  teamName: string
  opponentName: string
  week: number
  weekDate: string
  teamToken: string
}) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/team/${opts.teamToken}`
  await sendSMS(
    opts.phone,
    `BECSGL Wk ${opts.week} (${opts.weekDate}): ${opts.teamName} vs ${opts.opponentName}. Enter scores & coordinate tee time at ${url}`
  )
}

export async function sendMakeupReminder(opts: {
  phone: string
  teamName: string
  opponentName: string
  week: number
  teamToken: string
}) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/team/${opts.teamToken}`
  await sendSMS(
    opts.phone,
    `BECSGL reminder: your Wk ${opts.week} makeup match vs ${opts.opponentName} is still unplayed. Get it in before playoffs! ${url}`
  )
}

export async function sendScoreNotification(opts: {
  phone: string
  submittingTeam: string
  waitingTeam: string
  week: number
  teamToken: string
}) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/team/${opts.teamToken}`
  await sendSMS(
    opts.phone,
    `BECSGL Wk ${opts.week}: ${opts.submittingTeam} submitted their scores. Enter yours to lock the match: ${url}`
  )
}

export async function sendMatchLockedNotification(opts: {
  phones: string[]
  teamAName: string
  teamBName: string
  ptsA: number
  ptsB: number
  week: number
}) {
  const winner = opts.ptsA > opts.ptsB ? opts.teamAName : opts.ptsB > opts.ptsA ? opts.teamBName : null
  const result = `${opts.teamAName} ${opts.ptsA} — ${opts.teamBName} ${opts.ptsB}`
  const msg = `BECSGL Wk ${opts.week} locked: ${result}. ${winner ? winner + ' wins!' : 'Tied match!'}`
  await Promise.all(opts.phones.map(p => sendSMS(p, msg)))
}
