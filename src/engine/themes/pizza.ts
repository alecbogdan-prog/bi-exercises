import type { Model, Row } from '../model';
import { mulberry32 } from '../dataset';

// Slice & Co.: a fictional four-store pizza chain (Data Modeling exercises). Deterministic numbers.
export const PIZZA = 'Slice & Co.';

const PIZZAS: [string, string, number][] = [
  ['Margherita', 'Classic', 11],
  ['Pepperoni', 'Classic', 13],
  ['Hawaiian', 'Classic', 13],
  ['BBQ Chicken', 'Classic', 14],
  ['Garden Veggie', 'Veggie', 12],
  ['Mushroom Truffle', 'Veggie', 15],
  ['Diavola', 'Spicy', 14],
  ['Inferno', 'Spicy', 15],
];
const STORES: [string, string][] = [
  ['Downtown', 'Riverton'],
  ['Harbor', 'Riverton'],
  ['Uptown', 'Lakeview'],
  ['Station', 'Lakeview'],
];
const DRIVERS: [string, string][] = [
  ['Ana', 'Scooter'],
  ['Ben', 'Car'],
  ['Chloe', 'Bike'],
  ['Dev', 'Scooter'],
  ['Eli', 'Car'],
  ['Fatima', 'Bike'],
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');

export function buildPizzaModel(): Model {
  const rnd = mulberry32(31);
  const calendar: Row[] = [];
  const orders: Row[] = [];
  let id = 1;
  for (let d = new Date(Date.UTC(2026, 0, 1)); d.getUTCFullYear() === 2026 && d.getUTCMonth() < 6; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const dow = d.getUTCDay();
    calendar.push({ Date: iso, Month: MONTHS[d.getUTCMonth()], 'Month Num': d.getUTCMonth() + 1, 'Day of Week': DAYS[dow], 'Day Num': dow === 0 ? 7 : dow });
    const n = (dow === 5 || dow === 6 ? 11 : dow === 0 ? 9 : 6) + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const pizza = Math.floor(rnd() * rnd() * PIZZAS.length * 1.4) % PIZZAS.length;
      const store = Math.floor(rnd() * STORES.length);
      const driver = (store + Math.floor(rnd() * 3)) % DRIVERS.length;
      const qty = 1 + Math.floor(rnd() * rnd() * 3);
      orders.push({ OrderID: `O${String(id++).padStart(4, '0')}`, 'Order Date': iso, PizzaID: pizza + 1, StoreID: store + 1, DriverID: driver + 1, Quantity: qty, Amount: qty * PIZZAS[pizza][2] });
    }
  }
  return {
    tables: [
      {
        name: 'Orders',
        columns: [
          { name: 'OrderID', type: 'text' },
          { name: 'Order Date', type: 'date' },
          { name: 'PizzaID', type: 'number', format: 'integer', hidden: true },
          { name: 'StoreID', type: 'number', format: 'integer', hidden: true },
          { name: 'DriverID', type: 'number', format: 'integer', hidden: true },
          { name: 'Quantity', type: 'number', format: 'integer' },
          { name: 'Amount', type: 'number', format: 'currency' },
        ],
        rows: orders,
      },
      {
        name: 'Pizza',
        columns: [
          { name: 'PizzaID', type: 'number', format: 'integer', hidden: true },
          { name: 'Pizza', type: 'text' },
          { name: 'Style', type: 'text' },
          { name: 'Price', type: 'number', format: 'currency' },
        ],
        rows: PIZZAS.map(([name, style, price], i) => ({ PizzaID: i + 1, Pizza: name, Style: style, Price: price })),
      },
      {
        name: 'Store',
        columns: [
          { name: 'StoreID', type: 'number', format: 'integer', hidden: true },
          { name: 'Store', type: 'text' },
          { name: 'City', type: 'text' },
        ],
        rows: STORES.map(([name, city], i) => ({ StoreID: i + 1, Store: name, City: city })),
      },
      {
        name: 'Driver',
        columns: [
          { name: 'DriverID', type: 'number', format: 'integer', hidden: true },
          { name: 'Driver', type: 'text' },
          { name: 'Vehicle', type: 'text' },
        ],
        rows: DRIVERS.map(([name, vehicle], i) => ({ DriverID: i + 1, Driver: name, Vehicle: vehicle })),
      },
      {
        name: 'Calendar',
        columns: [
          { name: 'Date', type: 'date' },
          { name: 'Month', type: 'text', sortBy: 'Month Num' },
          { name: 'Month Num', type: 'number', format: 'integer', hidden: true },
          { name: 'Day of Week', type: 'text', sortBy: 'Day Num' },
          { name: 'Day Num', type: 'number', format: 'integer', hidden: true },
        ],
        rows: calendar,
      },
    ],
    relationships: [
      { fromTable: 'Orders', fromColumn: 'PizzaID', toTable: 'Pizza', toColumn: 'PizzaID' },
      { fromTable: 'Orders', fromColumn: 'StoreID', toTable: 'Store', toColumn: 'StoreID' },
      { fromTable: 'Orders', fromColumn: 'DriverID', toTable: 'Driver', toColumn: 'DriverID' },
      { fromTable: 'Orders', fromColumn: 'Order Date', toTable: 'Calendar', toColumn: 'Date' },
    ],
    measures: [],
  };
}
