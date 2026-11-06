import type { Model, Row, Table } from './model';

// Deterministic pseudo-random generator so every learner sees the same numbers.
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PRODUCTS: [string, string, string, number, number][] = [
  // name, category, color, price, cost
  ['Trail Bike', 'Bikes', 'Red', 1200, 780],
  ['Road Bike', 'Bikes', 'Black', 1650, 1050],
  ['City Bike', 'Bikes', 'Blue', 820, 520],
  ['Kids Bike', 'Bikes', 'Red', 340, 210],
  ['Helmet', 'Accessories', 'Black', 65, 28],
  ['Bike Lock', 'Accessories', 'Silver', 42, 15],
  ['Water Bottle', 'Accessories', 'Blue', 12, 4],
  ['Cycling Jersey', 'Clothing', 'Red', 75, 31],
  ['Rain Jacket', 'Clothing', 'Black', 120, 52],
  ['Gloves', 'Clothing', 'Black', 28, 11],
  ['Wheel Set', 'Components', 'Silver', 480, 290],
  ['Brake Kit', 'Components', 'Silver', 95, 48],
];

const STATES = ['CA', 'TX', 'NY', 'FL', 'WA', 'IL'];
const CITIES: Record<string, string[]> = {
  CA: ['Los Angeles', 'San Diego', 'San Jose'],
  TX: ['Austin', 'Houston', 'Dallas'],
  NY: ['New York', 'Buffalo'],
  FL: ['Miami', 'Orlando'],
  WA: ['Seattle', 'Spokane'],
  IL: ['Chicago', 'Springfield'],
};
const SEGMENTS = ['Consumer', 'Corporate', 'Small Business'];
const FIRST = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Drew'];
const LAST = ['Smith', 'Garcia', 'Chen', 'Patel', 'Brown', 'Lopez', 'Nguyen', 'Miller'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function buildModel(): Model {
  const rnd = mulberry32(20261103);

  const product: Table = {
    name: 'Product',
    columns: [
      { name: 'ProductID', type: 'number', format: 'integer', hidden: true },
      { name: 'Product', type: 'text' },
      { name: 'Category', type: 'text' },
      { name: 'Color', type: 'text' },
      { name: 'List Price', type: 'number', format: 'currency' },
      { name: 'Unit Cost', type: 'number', format: 'currency' },
    ],
    rows: PRODUCTS.map(([name, cat, color, price, cost], i) => ({
      ProductID: i + 1,
      Product: name,
      Category: cat,
      Color: color,
      'List Price': price,
      'Unit Cost': cost,
    })),
  };

  const customers: Row[] = [];
  for (let i = 0; i < 48; i++) {
    const state = STATES[i % STATES.length];
    const cities = CITIES[state];
    customers.push({
      CustomerID: i + 1,
      Customer: `${FIRST[i % FIRST.length]} ${LAST[(i * 3 + Math.floor(i / FIRST.length)) % LAST.length]}`,
      City: cities[Math.floor(rnd() * cities.length)],
      State: state,
      Segment: SEGMENTS[Math.floor(rnd() * SEGMENTS.length)],
    });
  }
  const customer: Table = {
    name: 'Customer',
    columns: [
      { name: 'CustomerID', type: 'number', format: 'integer', hidden: true },
      { name: 'Customer', type: 'text' },
      { name: 'City', type: 'text' },
      { name: 'State', type: 'text' },
      { name: 'Segment', type: 'text' },
    ],
    rows: customers,
  };

  const dates: Row[] = [];
  for (let d = new Date(Date.UTC(2024, 0, 1)); d.getUTCFullYear() < 2026; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    dates.push({
      Date: `${y}-${pad(m)}-${pad(d.getUTCDate())}`,
      Year: y,
      Quarter: `Q${Math.ceil(m / 3)}`,
      MonthNum: m,
      Month: MONTHS[m - 1],
      'Year Month': `${y}-${pad(m)}`,
    });
  }
  const date: Table = {
    name: 'Date',
    dateColumn: 'Date',
    columns: [
      { name: 'Date', type: 'date' },
      { name: 'Year', type: 'number', format: 'text' },
      { name: 'Quarter', type: 'text' },
      { name: 'MonthNum', type: 'number', format: 'integer', hidden: true },
      { name: 'Month', type: 'text', sortBy: 'MonthNum' },
      { name: 'Year Month', type: 'text' },
    ],
    rows: dates,
  };

  // Seasonality: more bikes sold in spring/summer, growth in 2025.
  const season = [0.6, 0.65, 0.9, 1.1, 1.3, 1.4, 1.35, 1.2, 1.0, 0.85, 0.8, 1.05];
  const sales: Row[] = [];
  let order = 1000;
  for (const dRow of dates) {
    const m = (dRow.MonthNum as number) - 1;
    const growth = dRow.Year === 2025 ? 1.18 : 1;
    const expected = 1.1 * season[m] * growth;
    let ordersToday = Math.floor(expected) + (rnd() < expected - Math.floor(expected) ? 1 : 0);
    while (ordersToday-- > 0) {
      order++;
      const cust = 1 + Math.floor(rnd() * customers.length);
      const lines = 1 + Math.floor(rnd() * 3);
      const used = new Set<number>();
      for (let l = 0; l < lines; l++) {
        // Accessories and clothing are more frequent than bikes.
        const pick = rnd();
        const pid = pick < 0.22 ? 1 + Math.floor(rnd() * 4) : 5 + Math.floor(rnd() * 8);
        if (used.has(pid)) continue;
        used.add(pid);
        const p = product.rows[pid - 1];
        const qty = pid <= 4 ? 1 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 5);
        const price = p['List Price'] as number;
        const discount = rnd() < 0.15 ? 0.1 : 0;
        sales.push({
          OrderID: `SO${order}`,
          'Order Date': dRow.Date,
          ProductID: pid,
          CustomerID: cust,
          StoreID: (order % 4) + 1,
          Quantity: qty,
          'Unit Price': Math.round(price * (1 - discount) * 100) / 100,
          'Sales Amount': Math.round(qty * price * (1 - discount) * 100) / 100,
        });
      }
    }
  }
  const salesTable: Table = {
    name: 'Sales',
    columns: [
      { name: 'OrderID', type: 'text' },
      { name: 'Order Date', type: 'date' },
      { name: 'ProductID', type: 'number', format: 'integer', hidden: true },
      { name: 'CustomerID', type: 'number', format: 'integer', hidden: true },
      { name: 'StoreID', type: 'number', format: 'integer', hidden: true },
      { name: 'Quantity', type: 'number', format: 'integer' },
      { name: 'Unit Price', type: 'number', format: 'currency' },
      { name: 'Sales Amount', type: 'number', format: 'currency' },
    ],
    rows: sales,
  };

  const store: Table = {
    name: 'Store',
    columns: [
      { name: 'StoreID', type: 'number', format: 'integer', hidden: true },
      { name: 'Store', type: 'text' },
      { name: 'Channel', type: 'text' },
      { name: 'Store City', type: 'text' },
    ],
    rows: [
      { StoreID: 1, Store: 'Downtown', Channel: 'Retail', 'Store City': 'Denver' },
      { StoreID: 2, Store: 'Riverside', Channel: 'Retail', 'Store City': 'Portland' },
      { StoreID: 3, Store: 'Online', Channel: 'Online', 'Store City': 'Online' },
      { StoreID: 4, Store: 'Airport', Channel: 'Retail', 'Store City': 'Denver' },
    ],
  };

  // Monthly sales targets per store, set close to actual sales (within about ±15%) like a realistic budget.
  // Deterministic: no random numbers, so the sales data is unchanged.
  const monthly = new Map<string, number>();
  for (const r of sales) {
    const key = `${String(r['Order Date']).slice(0, 7)}|${r.StoreID}`;
    monthly.set(key, (monthly.get(key) ?? 0) + Number(r['Sales Amount']));
  }
  // Target ÷ actual per store: Downtown and Online were budgeted a little high, Riverside and Airport a little low.
  const storeFactor = [1.06, 0.93, 1.1, 0.95];
  const targetRows: Row[] = [];
  for (const y of [2024, 2025]) {
    for (let mo = 1; mo <= 12; mo++) {
      storeFactor.forEach((factor, i) => {
        const actual = monthly.get(`${y}-${pad(mo)}|${i + 1}`) ?? 0;
        const wobble = 1 + 0.05 * Math.sin(mo * 1.7 + i * 2.3 + (y - 2024));
        targetRows.push({
          'Month Start': `${y}-${pad(mo)}-01`,
          StoreID: i + 1,
          Target: Math.round((actual * factor * wobble) / 100) * 100,
        });
      });
    }
  }
  const targets: Table = {
    name: 'Targets',
    columns: [
      { name: 'Month Start', type: 'date' },
      { name: 'StoreID', type: 'number', format: 'integer', hidden: true },
      { name: 'Target', type: 'number', format: 'currency' },
    ],
    rows: targetRows,
  };

  return {
    tables: [salesTable, product, customer, date, store, targets],
    relationships: [
      { fromTable: 'Sales', fromColumn: 'ProductID', toTable: 'Product', toColumn: 'ProductID' },
      { fromTable: 'Sales', fromColumn: 'CustomerID', toTable: 'Customer', toColumn: 'CustomerID' },
      { fromTable: 'Sales', fromColumn: 'Order Date', toTable: 'Date', toColumn: 'Date' },
      { fromTable: 'Sales', fromColumn: 'StoreID', toTable: 'Store', toColumn: 'StoreID' },
      { fromTable: 'Targets', fromColumn: 'Month Start', toTable: 'Date', toColumn: 'Date' },
      { fromTable: 'Targets', fromColumn: 'StoreID', toTable: 'Store', toColumn: 'StoreID' },
    ],
    measures: [],
  };
}

let cached: Model | null = null;
export function sampleModel(): Model {
  if (!cached) cached = buildModel();
  return cached;
}
