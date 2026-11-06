import type { Model } from './model';
import { FESTIVAL, buildFestivalModel } from './festival';
import { CINEMA, buildCinemaModel } from './themes/cinema';
import { COFFEE, buildCoffeeModel } from './themes/coffee';
import { FOOTBALL, buildFootballModel } from './themes/football';
import { PIZZA, buildPizzaModel } from './themes/pizza';

/** The themed sample datasets an exercise or project can run on instead of the Ridgeline Cycles bike shop. */
export type DatasetId = 'festival' | 'pizza' | 'football' | 'cinema' | 'coffee';

export const DATASETS: Record<DatasetId, { name: string; build: () => Model }> = {
  festival: { name: FESTIVAL, build: buildFestivalModel },
  pizza: { name: PIZZA, build: buildPizzaModel },
  football: { name: FOOTBALL, build: buildFootballModel },
  cinema: { name: CINEMA, build: buildCinemaModel },
  coffee: { name: COFFEE, build: buildCoffeeModel },
};

/** The organisation behind a dataset's data (Ridgeline Cycles for the bike shop). */
export const orgOf = (id?: DatasetId) => (id ? DATASETS[id].name : 'Ridgeline Cycles');
