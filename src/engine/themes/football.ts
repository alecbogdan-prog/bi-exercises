import type { Model, Row } from '../model';
import { mulberry32 } from '../dataset';

// The Northfield League: a fictional ten-team football league over two seasons (CALCULATE exercises).
export const FOOTBALL = 'Northfield League';

// [team, city, kit colour, strength 0..1]
const TEAMS: [string, string, string, number][] = [
  ['Ashby Rovers', 'Ashby', 'Red', 0.86],
  ['Bramley Town', 'Bramley', 'Blue', 0.74],
  ['Corrin Athletic', 'Corrin', 'Green', 0.61],
  ['Dunmore City', 'Dunmore', 'Sky Blue', 0.79],
  ['Elsworth United', 'Elsworth', 'Yellow', 0.48],
  ['Fennick FC', 'Fennick', 'Black', 0.55],
  ['Glenholt Wanderers', 'Glenholt', 'White', 0.42],
  ['Harrow Vale', 'Harrow', 'Orange', 0.66],
  ['Irvington Albion', 'Irvington', 'Purple', 0.37],
  ['Jarrow Park', 'Jarrow', 'Maroon', 0.51],
];
const SEASONS = ['2024/25', '2025/26'];

export function buildFootballModel(): Model {
  const rnd = mulberry32(77);
  const goals = (attack: number, defence: number, home: boolean) => {
    const mean = 0.6 + 1.9 * attack - 0.9 * defence + (home ? 0.35 : 0);
    let g = 0;
    for (let i = 0; i < 6; i++) if (rnd() < mean / 6) g++;
    return g;
  };
  const results: Row[] = [];
  let match = 1;
  for (const season of SEASONS) {
    for (let h = 0; h < TEAMS.length; h++) {
      for (let a = 0; a < TEAMS.length; a++) {
        if (h === a) continue;
        const gh = goals(TEAMS[h][3], TEAMS[a][3], true);
        const ga = goals(TEAMS[a][3], TEAMS[h][3], false);
        const id = `M${String(match++).padStart(3, '0')}`;
        const row = (team: number, venue: string, gf: number, gA: number): Row => ({
          MatchID: id,
          TeamID: team + 1,
          Season: season,
          Venue: venue,
          'Goals For': gf,
          'Goals Against': gA,
          Result: gf > gA ? 'Win' : gf === gA ? 'Draw' : 'Loss',
          Points: gf > gA ? 3 : gf === gA ? 1 : 0,
        });
        results.push(row(h, 'Home', gh, ga), row(a, 'Away', ga, gh));
      }
    }
  }
  return {
    tables: [
      {
        name: 'Results',
        columns: [
          { name: 'MatchID', type: 'text' },
          { name: 'TeamID', type: 'number', format: 'integer', hidden: true },
          { name: 'Season', type: 'text' },
          { name: 'Venue', type: 'text' },
          { name: 'Goals For', type: 'number', format: 'integer' },
          { name: 'Goals Against', type: 'number', format: 'integer' },
          { name: 'Result', type: 'text' },
          { name: 'Points', type: 'number', format: 'integer' },
        ],
        rows: results,
      },
      {
        name: 'Team',
        columns: [
          { name: 'TeamID', type: 'number', format: 'integer', hidden: true },
          { name: 'Team', type: 'text' },
          { name: 'City', type: 'text' },
          { name: 'Kit Colour', type: 'text' },
        ],
        rows: TEAMS.map(([name, city, kit], i) => ({ TeamID: i + 1, Team: name, City: city, 'Kit Colour': kit })),
      },
    ],
    relationships: [{ fromTable: 'Results', fromColumn: 'TeamID', toTable: 'Team', toColumn: 'TeamID' }],
    measures: [],
  };
}
