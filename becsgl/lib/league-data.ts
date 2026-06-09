export const TEAMS = [
  { id: 1,  short: 'Klein/Riggs',           player1: 'Klein',      player2: 'Riggs' },
  { id: 2,  short: 'Sabori/Ramirez',         player1: 'Sabori',     player2: 'Ramirez' },
  { id: 3,  short: 'Tortorelli/Driskill',    player1: 'Tortorelli', player2: 'Driskill' },
  { id: 4,  short: 'Walker/Baker',           player1: 'Walker',     player2: 'Baker' },
  { id: 5,  short: 'Merrifield/Merrifield',  player1: 'Merrifield', player2: 'Merrifield' },
  { id: 6,  short: 'Gibbons/Underwood',      player1: 'Gibbons',    player2: 'Underwood' },
  { id: 7,  short: 'McEwen/McEwen',          player1: 'McEwen B.',  player2: 'McEwen R.' },
  { id: 8,  short: 'Cratte/Carpenter',       player1: 'Cratte',     player2: 'Carpenter' },
  { id: 9,  short: 'Keller/Reidhead',        player1: 'Keller',     player2: 'Reidhead' },
  { id: 10, short: 'Stellflug/Glaberman',    player1: 'Stellflug',  player2: 'Glaberman' },
  { id: 11, short: 'Kerns/Lewis',            player1: 'Kerns',      player2: 'Lewis' },
  { id: 12, short: 'Ramirez/McCutcheon',     player1: 'Ramirez D.', player2: 'McCutcheon' },
  { id: 13, short: 'Castenada/Tant',         player1: 'Castenada',  player2: 'Tant' },
  { id: 14, short: 'Evans/McEwen G.',        player1: 'Evans',      player2: 'McEwen G.' },
  { id: 15, short: 'Alvarez/Chavez',         player1: 'Alvarez',    player2: 'Chavez' },
  { id: 16, short: 'Pena/Tolle',             player1: 'Pena',       player2: 'Tolle' },
  { id: 17, short: 'Stepanek/Stonehouse',    player1: 'Stepanek',   player2: 'Stonehouse' },
  { id: 18, short: 'Pico/Ray',               player1: 'Pico',       player2: 'Ray' },
  { id: 19, short: 'Villalobos/Villalobos',  player1: 'Villalobos F.', player2: 'Villalobos N.' },
  { id: 20, short: 'Moya/Moya',             player1: 'Moya R.',    player2: 'Moya S.' },
]

// SCHED[week-1][teamId-1] = opponent team id for that week
export const SCHED = [
  [16,6,4,3,12,2,9,20,7,13,11,5,10,17,15,1,14,19,18,8],
  [3,20,1,9,8,15,14,5,4,17,19,16,18,7,6,12,10,13,11,2],
  [9,5,12,14,2,20,10,16,1,7,13,3,11,4,19,8,18,17,15,6],
  [14,16,8,10,20,19,18,3,12,4,17,9,15,1,13,2,11,7,6,5],
  [10,3,2,18,6,5,11,9,8,1,7,14,19,12,17,20,15,4,13,16],
  [18,9,20,11,16,13,15,14,2,12,4,10,6,8,7,5,19,1,17,3],
  [11,14,5,15,3,16,19,10,20,8,1,18,17,2,4,6,13,12,7,9],
  [15,10,16,19,9,17,13,18,5,2,12,11,7,20,1,3,6,8,4,14],
  [19,18,6,13,14,3,17,11,16,20,8,15,4,5,12,9,7,2,1,10],
  [13,11,9,17,10,7,6,15,3,5,2,19,1,16,8,14,4,20,12,18],
  [17,15,14,7,18,9,4,19,6,16,20,13,12,3,2,10,1,5,8,11],
  [7,19,10,6,11,4,1,13,14,3,5,17,8,9,20,18,12,16,2,15],
  [4,13,18,1,15,14,12,17,10,9,16,7,2,6,5,11,8,3,20,19],
  [6,17,11,12,19,1,8,7,18,14,3,4,20,10,16,15,2,9,5,13],
  [12,7,15,8,13,10,2,4,11,6,9,1,5,18,3,19,20,14,16,17],
]

export const WEEK_DATES = [
  'wk of 5/4',  'wk of 5/11', 'wk of 5/18', 'wk of 5/25',
  'wk of 6/1',  'wk of 6/8',  'wk of 6/15', 'wk of 6/22',
  'catch-up / holiday (6/29)',
  'wk of 7/6',  'wk of 7/13', 'wk of 7/20', 'wk of 7/27',
  'wk of 8/3',  'wk of 8/10',
]

export const TOTAL_WEEKS = 15
export const SKIP_WEEKS = [9] // week 9 is catch-up/holiday — no scheduled matches

export function getOpponent(teamId: number, week: number): number {
  return SCHED[week - 1][teamId - 1]
}

export function getTeam(id: number) {
  return TEAMS.find(t => t.id === id)!
}

export function getMatchPairs(week: number): { teamA: number; teamB: number }[] {
  const seen = new Set<string>()
  const pairs: { teamA: number; teamB: number }[] = []
  SCHED[week - 1].forEach((oppId, idx) => {
    const teamId = idx + 1
    const key = [Math.min(teamId, oppId), Math.max(teamId, oppId)].join('-')
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push({ teamA: teamId, teamB: oppId })
    }
  })
  return pairs
}

// Points scoring: 2 pts for winning a hole, 1 each for tie, 0 for loss.
// Winner of match gets +2 bonus points (or +1 each for tied match).
// Max possible: 9 holes × 2 pts + 2 bonus = 20 pts.
export function calcMatchPoints(scoresA: number[], scoresB: number[]): { ptsA: number; ptsB: number } {
  let hA = 0, hB = 0
  scoresA.forEach((s, i) => {
    const b = scoresB[i]
    if (s < b) hA += 2
    else if (b < s) hB += 2
    else { hA += 1; hB += 1 }
  })
  let bA = 0, bB = 0
  if (hA > hB) bA = 2
  else if (hB > hA) bB = 2
  else { bA = 1; bB = 1 }
  return { ptsA: hA + bA, ptsB: hB + bB }
}
