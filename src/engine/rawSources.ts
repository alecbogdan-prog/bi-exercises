// Fictional raw files for the Power Query exercises. They are messy on purpose.
import type { QTable, QType } from './query';
import type { Scalar } from './model';

const t = (cols: [string, QType][], rows: Scalar[][]): QTable => ({ columns: cols.map(([name, type]) => ({ name, type })), rows });
const csv = (rows: Scalar[][]): QTable => t(rows[0].map((_, i) => [`Column${i + 1}`, 'any'] as [string, QType]), rows);

export interface RawSource {
  name: string;
  /** File name shown in the Source step. */
  file: string;
  table: QTable;
}

const PRODUCTS: [string, string, string][] = [
  ['PRD-0001', 'Trail Bike', 'Bikes'],
  ['PRD-0002', 'Road Bike', 'Bikes'],
  ['PRD-0003', 'City Bike', 'Bikes'],
  ['PRD-0004', 'Kids Bike', 'Bikes'],
  ['PRD-0005', 'Helmet', 'Accessories'],
  ['PRD-0006', 'Bike Lock', 'Accessories'],
  ['PRD-0007', 'Water Bottle', 'Accessories'],
  ['PRD-0008', 'Cycling Jersey', 'Clothing'],
  ['PRD-0009', 'Rain Jacket', 'Clothing'],
  ['PRD-0010', 'Gloves', 'Clothing'],
  ['PRD-0011', 'Wheel Set', 'Components'],
  ['PRD-0012', 'Brake Kit', 'Components'],
];

export const RAW_SOURCES: RawSource[] = [
  {
    name: 'Supplier Orders',
    file: 'Supplier Orders.csv',
    table: csv([
      ['OrderRef', 'Supplier', 'Product Code', 'Qty', 'Unit Cost', 'Notes'],
      ['PO-1001', ' Velo Parts ', 'PRD-0011', '20', '290.00', 'urgent'],
      ['PO-1002', 'SPOKE & CO', 'PRD-0005', '50', '28.00', ''],
      ['PO-1003', 'velo parts', 'PRD-0012', '40', '48.00', ''],
      ['PO-1004', 'Northgear', 'PRD-0009', '60', '52.00', 'check box sizes'],
      ['', '', '', '', '', ''],
      ['PO-1005', 'Spoke & Co ', 'PRD-0006', '100', '15.00', ''],
      ['PO-1006', 'NORTHGEAR', 'PRD-0008', '30', '31.00', ''],
      ['PO-1006', 'NORTHGEAR', 'PRD-0008', '30', '31.00', ''],
      ['PO-1007', 'Velo Parts', 'PRD-0001', '8', '780.00', ''],
      ['', '', '', '', '', ''],
      ['PO-1008', ' spoke & co', 'PRD-0007', '45', '4.00', 'late delivery'],
      ['PO-1009', 'Northgear', 'PRD-0004', '10', '210.00', ''],
      ['PO-1010', 'Velo Parts', 'PRD-0002', '5', '1050.00', ''],
    ]),
  },
  {
    name: 'Returns',
    file: 'Returns.csv',
    table: t(
      [
        ['ReturnID', 'text'],
        ['Product Code', 'text'],
        ['Reason', 'text'],
        ['Qty', 'int'],
      ],
      [
        ['R-201', 'PRD-0003', 'Damaged', 1],
        ['R-202', 'PRD-0008', 'Wrong size', 2],
        ['R-203', 'PRD-0005', 'N/A', 1],
        ['R-204', 'PRD-0011', 'Damaged', 1],
        ['R-205', 'PRD-0009', 'Wrong size', 1],
        ['R-206', 'PRD-0001', 'Changed mind', 1],
        ['R-207', 'PRD-0010', 'N/A', 3],
        ['R-208', 'PRD-0008', 'Wrong size', 1],
        ['R-209', 'PRD-0006', 'Damaged', 2],
        ['R-210', 'PRD-0002', 'N/A', 1],
      ],
    ),
  },
  {
    name: 'Store Targets',
    file: 'Store Targets.xlsx',
    table: t(
      [
        ['Store', 'text'],
        ['Jan', 'int'],
        ['Feb', 'int'],
        ['Mar', 'int'],
        ['Apr', 'int'],
        ['May', 'int'],
        ['Jun', 'int'],
      ],
      [
        ['Downtown', 18000, 19000, 24000, 28000, 32000, 34000],
        ['Riverside', 12000, 12500, 16000, 19000, 22000, 23000],
        ['Online', 25000, 26000, 30000, 33000, 38000, 41000],
        ['Airport', 6000, 6000, 7500, 9000, 11000, 12000],
      ],
    ),
  },
  {
    name: 'Store Sales',
    file: 'Store Sales.xlsx',
    table: t(
      [
        ['Store', 'text'],
        ['Order Date', 'date'],
        ['Amount', 'decimal'],
      ],
      [
        ['Downtown', '2025-03-02', 1240.5],
        ['Riverside', '2025-03-02', 310],
        ['Online', '2025-03-03', 2210],
        ['Downtown', '2025-03-04', 865],
        ['Airport', '2025-03-04', 142.5],
        ['Online', '2025-03-05', 1675.25],
        ['Riverside', '2025-03-06', 980],
        ['Downtown', '2025-03-07', 2105],
        ['Online', '2025-03-08', 455],
        ['Airport', '2025-03-08', 96],
        ['Riverside', '2025-03-09', 1320],
        ['Online', '2025-03-10', 3020.75],
        ['Downtown', '2025-03-11', 540],
        ['Airport', '2025-03-12', 310],
        ['Online', '2025-03-12', 820],
      ],
    ),
  },
  {
    name: 'Web Orders 2025',
    file: 'Web Orders 2025.xlsx',
    table: t(
      [
        ['OrderID', 'text'],
        ['Order Date', 'date'],
        ['Product', 'text'],
        ['Quantity', 'int'],
        ['Amount', 'decimal'],
      ],
      [
        ['W-5001', '2025-04-01', 'Helmet', 2, 130],
        ['W-5002', '2025-04-01', 'Road Bike', 1, 1650],
        ['W-5003', '2025-04-02', 'Gloves', 3, 84],
        ['W-5004', '2025-04-03', 'Water Bottle', 4, 48],
        ['W-5005', '2025-04-03', 'Rain Jacket', 1, 120],
      ],
    ),
  },
  {
    name: 'Store Orders 2025',
    file: 'Store Orders 2025.xlsx',
    table: t(
      [
        ['OrderID', 'text'],
        ['Order Date', 'date'],
        ['Product', 'text'],
        ['Quantity', 'int'],
        ['Amount', 'decimal'],
      ],
      [
        ['S-7101', '2025-04-01', 'Trail Bike', 1, 1200],
        ['S-7102', '2025-04-02', 'Bike Lock', 2, 84],
        ['S-7103', '2025-04-02', 'Kids Bike', 1, 340],
        ['S-7104', '2025-04-04', 'Cycling Jersey', 2, 150],
      ],
    ),
  },
  {
    name: 'Service Jobs',
    file: 'Service Jobs.csv',
    table: csv([
      ['JobID', 'Job Date', 'Bike ID', 'Technician', 'Service', 'Minutes', 'Price'],
      ['J-301', '2025-05-02', 'rc-102', ' maria lopez', 'Tune-up', '45', '59.00'],
      ['J-302', '2025-05-02', 'RC-087', 'JAMES PARK', 'Brake fix', '30', '39.50'],
      ['J-303', '2025-05-03', 'rc-140', 'Maria Lopez ', 'Flat repair', '15', '19.00'],
      ['', '', '', '', '', '', ''],
      ['J-304', '2025-05-05', 'Rc-033', 'lee chen', 'Brake fix', '35', '39.50'],
      ['J-305', '2025-05-05', 'RC-102', 'james park', 'Tune-up', '50', '59.00'],
      ['J-306', '2025-05-06', 'rc-118', 'Lee Chen', 'Brake upgrade', '60', '120.00'],
      ['J-307', '2025-05-07', 'RC-140', ' MARIA LOPEZ ', 'Flat repair', '10', '19.00'],
      ['', '', '', '', '', '', ''],
      ['J-308', '2025-05-08', 'rc-087', 'James Park', 'Tune-up', '40', '59.00'],
    ]),
  },
  {
    name: 'Regional Sales',
    file: 'Regional Sales.xlsx',
    table: t(
      [
        ['Region', 'text'],
        ['Store', 'text'],
        ['Q1 Sales', 'int'],
      ],
      [
        ['West', 'Downtown', 61200],
        [null, 'Riverside', 44800],
        ['Online', 'Web shop', 83500],
        ['East', 'Airport', 19700],
        [null, 'Harbor', 27300],
        [null, 'Old Town', 31900],
      ],
    ),
  },
  {
    name: 'Channel Sales',
    file: 'Channel Sales.csv',
    table: t(
      [
        ['Month', 'text'],
        ['Channel', 'text'],
        ['Amount', 'decimal'],
      ],
      [
        ['2025-01', 'Retail', 21400],
        ['2025-01', 'Online', 15800],
        ['2025-01', 'Wholesale', 6200],
        ['2025-02', 'Retail', 22900],
        ['2025-02', 'Online', 17100],
        ['2025-02', 'Wholesale', 5900],
        ['2025-03', 'Retail', 30500],
        ['2025-03', 'Online', 24300],
        ['2025-03', 'Wholesale', 8100],
      ],
    ),
  },
  {
    name: 'Order Lines Q2',
    file: 'Order Lines Q2.csv',
    table: t(
      [
        ['Line', 'int'],
        ['Product Code', 'text'],
        ['Qty', 'int'],
      ],
      [
        [1, 'PRD-0005', 4],
        [2, 'PRD-0002', 1],
        [3, 'PRD-0099', 2],
        [4, 'PRD-0011', 1],
        [5, 'PRD-0008', 3],
        [6, 'PRD-0042', 6],
        [7, 'PRD-0001', 1],
      ],
    ),
  },
  {
    name: 'Product Lookup',
    file: 'Product Lookup.xlsx',
    table: t(
      [
        ['Product Code', 'text'],
        ['Product', 'text'],
        ['Category', 'text'],
      ],
      PRODUCTS.map((p) => [...p]),
    ),
  },
];

export function rawSource(name: string): RawSource {
  const s = RAW_SOURCES.find((x) => x.name === name);
  if (!s) throw new Error(`Unknown source ${name}`);
  return s;
}

export function sourceTables(): Record<string, QTable> {
  return Object.fromEntries(RAW_SOURCES.map((s) => [s.name, s.table]));
}
