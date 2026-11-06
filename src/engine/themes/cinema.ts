import type { Model, Row } from '../model';
import { mulberry32 } from '../dataset';

// Lumen Cinemas: a fictional four-cinema chain (Report Pages exercises). Deterministic numbers.
export const CINEMA = 'Lumen Cinemas';

// [film, genre, rating, popularity 0..1]. All titles are invented.
const FILMS: [string, string, string, number][] = [
  ['Starlight Harbor', 'Drama', '12', 0.62],
  ['The Last Lighthouse', 'Drama', '15', 0.48],
  ['Rocket Grandma', 'Comedy', 'PG', 0.71],
  ['Office of Chaos', 'Comedy', '12', 0.55],
  ['Iron Comet', 'Action', '12', 0.93],
  ['Velocity Zero', 'Action', '15', 0.77],
  ['Paper Dragons', 'Animation', 'PG', 0.88],
  ['The Clockwork Fox', 'Animation', 'PG', 0.66],
  ['Hollow Pines', 'Horror', '15', 0.44],
  ['Night Signal', 'Horror', '15', 0.39],
  ['Deep Blue Line', 'Documentary', 'PG', 0.28],
  ['Mountain Voices', 'Documentary', 'PG', 0.22],
];
const CINEMAS: [string, string, number][] = [
  ['Lumen Central', 'Riverton', 1.25],
  ['Lumen Quay', 'Riverton', 0.9],
  ['Lumen Hill', 'Lakeview', 0.8],
  ['Lumen Park', 'Fairmont', 1.05],
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export function buildCinemaModel(): Model {
  const rnd = mulberry32(12);
  const screenings: Row[] = [];
  let id = 1;
  MONTHS.forEach((month, mi) => {
    FILMS.forEach(([, , , pop], fi) => {
      CINEMAS.forEach(([, , size], ci) => {
        for (const day of ['Weekday', 'Weekend']) {
          const tickets = Math.round((day === 'Weekend' ? 520 : 380) * size * (0.3 + pop) * (0.8 + 0.4 * rnd()) * (1 + 0.04 * Math.sin(mi + fi)));
          const price = day === 'Weekend' ? 12.5 : 10;
          screenings.push({ ScreeningID: `S${String(id++).padStart(4, '0')}`, FilmID: fi + 1, CinemaID: ci + 1, Month: month, 'Month Num': mi + 1, 'Day Type': day, Tickets: tickets, Revenue: Math.round(tickets * price) });
        }
      });
    });
  });
  return {
    tables: [
      {
        name: 'Screenings',
        columns: [
          { name: 'ScreeningID', type: 'text' },
          { name: 'FilmID', type: 'number', format: 'integer', hidden: true },
          { name: 'CinemaID', type: 'number', format: 'integer', hidden: true },
          { name: 'Month', type: 'text', sortBy: 'Month Num' },
          { name: 'Month Num', type: 'number', format: 'integer', hidden: true },
          { name: 'Day Type', type: 'text' },
          { name: 'Tickets', type: 'number', format: 'integer' },
          { name: 'Revenue', type: 'number', format: 'currency' },
        ],
        rows: screenings,
      },
      {
        name: 'Film',
        columns: [
          { name: 'FilmID', type: 'number', format: 'integer', hidden: true },
          { name: 'Film', type: 'text' },
          { name: 'Genre', type: 'text' },
          { name: 'Rating', type: 'text' },
        ],
        rows: FILMS.map(([name, genre, rating], i) => ({ FilmID: i + 1, Film: name, Genre: genre, Rating: rating })),
      },
      {
        name: 'Cinema',
        columns: [
          { name: 'CinemaID', type: 'number', format: 'integer', hidden: true },
          { name: 'Cinema', type: 'text' },
          { name: 'City', type: 'text' },
        ],
        rows: CINEMAS.map(([name, city], i) => ({ CinemaID: i + 1, Cinema: name, City: city })),
      },
    ],
    relationships: [
      { fromTable: 'Screenings', fromColumn: 'FilmID', toTable: 'Film', toColumn: 'FilmID' },
      { fromTable: 'Screenings', fromColumn: 'CinemaID', toTable: 'Cinema', toColumn: 'CinemaID' },
    ],
    measures: [],
  };
}
