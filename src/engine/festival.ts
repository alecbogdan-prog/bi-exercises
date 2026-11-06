import type { Model, Row, Table } from './model';
import { mulberry32 } from './dataset';

// A second, themed sample dataset: the fictional Pinewave Festival (three days, four stages, thirty made-up acts).
// Deterministic, so every learner sees the same numbers. Used by exercises that set `dataset: 'festival'`.

export const FESTIVAL = 'Pinewave Festival';

const GENRES = ['Rock', 'Pop', 'Indie', 'Electronic', 'Hip-hop'] as const;

// [name, genre index, home country, popularity 0..1]. All names are invented.
const ARTISTS: [string, number, string, number][] = [
  ['The Paper Comets', 0, 'UK', 0.92],
  ['Copper Lanterns', 0, 'Ireland', 0.55],
  ['Gravel & Gold', 0, 'USA', 0.71],
  ['Northbound Wolves', 0, 'Canada', 0.38],
  ['Iron Meadow', 0, 'Germany', 0.47],
  ['Rust Parade', 0, 'Australia', 0.29],
  ['Neon Harbor Kids', 1, 'USA', 0.97],
  ['Mila Sunday', 1, 'Sweden', 0.83],
  ['Candy Satellite', 1, 'UK', 0.61],
  ['Juno Bright', 1, 'Canada', 0.44],
  ['The Velvet Postcards', 1, 'Ireland', 0.35],
  ['Lolo Vance', 1, 'Netherlands', 0.52],
  ['Saffron Tide', 2, 'UK', 0.66],
  ['Kite Theory', 2, 'Ireland', 0.58],
  ['Marble Youth', 2, 'Australia', 0.41],
  ['Owls in Winter', 2, 'Sweden', 0.33],
  ['Tin Orchard', 2, 'Canada', 0.49],
  ['Glass Fernway', 2, 'USA', 0.27],
  ['Polar Disco', 3, 'Netherlands', 0.88],
  ['Static Bloom', 3, 'Germany', 0.74],
  ['Lumen Grid', 3, 'Sweden', 0.57],
  ['Night Arcade', 3, 'UK', 0.45],
  ['Pulse Quarry', 3, 'Germany', 0.31],
  ['Hexa Moon', 3, 'Australia', 0.24],
  ['Lil Comet', 4, 'USA', 0.9],
  ['Verse Atlas', 4, 'UK', 0.63],
  ['MC Junebug', 4, 'Canada', 0.5],
  ['Block Ballad', 4, 'USA', 0.42],
  ['Dez Arcadia', 4, 'Ireland', 0.36],
  ['Kora Lane', 4, 'Netherlands', 0.26],
];

// [name, capacity]
const STAGES: [string, number][] = [
  ['Main Stage', 12000],
  ['Lakeside', 6000],
  ['Forest Stage', 3500],
  ['The Tent', 2000],
];

const DAYS = ['Friday', 'Saturday', 'Sunday'];
const DAY_BOOST = [0, 0.08, -0.03];
const SLOTS = ['14:00', '16:00', '18:00', '20:00', '22:00'];
// Average merch spend per fan, by genre.
const SPEND = [6.5, 5.2, 4.1, 3.6, 4.8];

export function buildFestivalModel(): Model {
  const rnd = mulberry32(2026);
  const performances: Row[] = [];
  // 3 days × 4 stages × 5 slots = 60 shows; every act plays twice, on two different days.
  for (let s = 0; s < 60; s++) {
    const day = Math.floor(s / 20);
    const stage = Math.floor((s % 20) / 5);
    const slot = s % 5;
    const artist = (s * 7) % 30;
    const [, genre, , pop] = ARTISTS[artist];
    const fill = Math.min(0.98, 0.3 + 0.45 * pop + 0.04 * slot + DAY_BOOST[day] + 0.08 * rnd());
    const attendance = Math.round(STAGES[stage][1] * fill);
    const merch = Math.round(attendance * SPEND[genre] * (0.8 + 0.4 * rnd()) * 100) / 100;
    performances.push({
      PerformanceID: `P${String(s + 1).padStart(2, '0')}`,
      ArtistID: artist + 1,
      StageID: stage + 1,
      Day: DAYS[day],
      Start: SLOTS[slot],
      Attendance: attendance,
      'Merch Sales': merch,
    });
  }

  const performanceTable: Table = {
    name: 'Performances',
    columns: [
      { name: 'PerformanceID', type: 'text' },
      { name: 'ArtistID', type: 'number', format: 'integer', hidden: true },
      { name: 'StageID', type: 'number', format: 'integer', hidden: true },
      { name: 'Day', type: 'text' },
      { name: 'Start', type: 'text' },
      { name: 'Attendance', type: 'number', format: 'integer' },
      { name: 'Merch Sales', type: 'number', format: 'currency' },
    ],
    rows: performances,
  };
  const artistTable: Table = {
    name: 'Artist',
    columns: [
      { name: 'ArtistID', type: 'number', format: 'integer', hidden: true },
      { name: 'Artist', type: 'text' },
      { name: 'Genre', type: 'text' },
      { name: 'Home Country', type: 'text' },
    ],
    rows: ARTISTS.map(([name, genre, country], i) => ({ ArtistID: i + 1, Artist: name, Genre: GENRES[genre], 'Home Country': country })),
  };
  const stageTable: Table = {
    name: 'Stage',
    columns: [
      { name: 'StageID', type: 'number', format: 'integer', hidden: true },
      { name: 'Stage', type: 'text' },
      { name: 'Capacity', type: 'number', format: 'integer' },
    ],
    rows: STAGES.map(([name, capacity], i) => ({ StageID: i + 1, Stage: name, Capacity: capacity })),
  };

  return {
    tables: [performanceTable, artistTable, stageTable],
    relationships: [
      { fromTable: 'Performances', fromColumn: 'ArtistID', toTable: 'Artist', toColumn: 'ArtistID' },
      { fromTable: 'Performances', fromColumn: 'StageID', toTable: 'Stage', toColumn: 'StageID' },
    ],
    measures: [],
  };
}

let cached: Model | null = null;
export function festivalModel(): Model {
  if (!cached) cached = buildFestivalModel();
  return cached;
}
