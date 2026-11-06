import type { Model, Row } from '../model';
import { mulberry32 } from '../dataset';

// Copperbean Coffee: a fictional five-shop coffee chain (Advanced DAX exercises). Deterministic numbers.
export const COFFEE = 'Copperbean Coffee';

// [drink, category, price, cost per cup, popularity]
const DRINKS: [string, string, number, number, number][] = [
  ['Espresso', 'Espresso', 2.6, 0.55, 0.5],
  ['Flat White', 'Espresso', 3.6, 0.9, 0.95],
  ['Cappuccino', 'Espresso', 3.5, 0.85, 0.85],
  ['Oat Latte', 'Espresso', 4.1, 1.2, 0.8],
  ['Earl Grey', 'Tea', 2.8, 0.35, 0.35],
  ['Chai Latte', 'Tea', 3.9, 1.05, 0.55],
  ['Matcha Latte', 'Tea', 4.4, 1.6, 0.45],
  ['Cold Brew', 'Cold Drinks', 3.8, 0.8, 0.6],
  ['Iced Mocha', 'Cold Drinks', 4.5, 1.45, 0.5],
  ['Hot Chocolate', 'Hot Chocolate', 3.4, 0.95, 0.4],
];
const STORES: [string, string, number][] = [
  ['Copperbean Station', 'Old Town', 1.3],
  ['Copperbean Library', 'Old Town', 0.85],
  ['Copperbean Riverside', 'Harbour', 1.0],
  ['Copperbean Campus', 'University', 1.15],
  ['Copperbean Market', 'Harbour', 0.75],
];
const MONTHS = ['Jan', 'Feb', 'Mar'];

export function buildCoffeeModel(): Model {
  const rnd = mulberry32(5);
  const orders: Row[] = [];
  let id = 1;
  MONTHS.forEach((month, mi) => {
    STORES.forEach(([, hood, size], si) => {
      DRINKS.forEach(([, cat, price, , pop], di) => {
        for (let hour = 7; hour <= 19; hour++) {
          // Morning rush for coffee, afternoon peak for cold drinks and tea; students keep the campus busy late.
          const rush = cat === 'Espresso' ? Math.exp(-((hour - 8.5) ** 2) / 6) : Math.exp(-((hour - 15) ** 2) / 10);
          const late = hood === 'University' && hour >= 16 ? 0.25 : 0;
          const cups = Math.round(40 * size * pop * (0.15 + rush + late) * (0.85 + 0.3 * rnd()) * (cat === 'Cold Drinks' ? 0.6 + 0.2 * mi : 1));
          if (cups <= 0) continue;
          orders.push({ LineID: `L${String(id++).padStart(5, '0')}`, StoreID: si + 1, DrinkID: di + 1, Month: month, 'Month Num': mi + 1, Hour: hour, Cups: cups, Revenue: Math.round(cups * price * 100) / 100 });
        }
      });
    });
  });
  return {
    tables: [
      {
        name: 'Orders',
        columns: [
          { name: 'LineID', type: 'text' },
          { name: 'StoreID', type: 'number', format: 'integer', hidden: true },
          { name: 'DrinkID', type: 'number', format: 'integer', hidden: true },
          { name: 'Month', type: 'text', sortBy: 'Month Num' },
          { name: 'Month Num', type: 'number', format: 'integer', hidden: true },
          { name: 'Hour', type: 'number', format: 'integer' },
          { name: 'Cups', type: 'number', format: 'integer' },
          { name: 'Revenue', type: 'number', format: 'currency' },
        ],
        rows: orders,
      },
      {
        name: 'Drink',
        columns: [
          { name: 'DrinkID', type: 'number', format: 'integer', hidden: true },
          { name: 'Drink', type: 'text' },
          { name: 'Category', type: 'text' },
          { name: 'Price', type: 'number', format: 'currency' },
          { name: 'Cost per Cup', type: 'number', format: 'currency' },
        ],
        rows: DRINKS.map(([name, cat, price, cost], i) => ({ DrinkID: i + 1, Drink: name, Category: cat, Price: price, 'Cost per Cup': cost })),
      },
      {
        name: 'Store',
        columns: [
          { name: 'StoreID', type: 'number', format: 'integer', hidden: true },
          { name: 'Store', type: 'text' },
          { name: 'Neighbourhood', type: 'text' },
        ],
        rows: STORES.map(([name, hood], i) => ({ StoreID: i + 1, Store: name, Neighbourhood: hood })),
      },
    ],
    relationships: [
      { fromTable: 'Orders', fromColumn: 'DrinkID', toTable: 'Drink', toColumn: 'DrinkID' },
      { fromTable: 'Orders', fromColumn: 'StoreID', toTable: 'Store', toColumn: 'StoreID' },
    ],
    measures: [],
  };
}
