import { describe, expect, it } from 'vitest';
import { modelCsvFiles, zipFiles } from './download';

describe('downloads', () => {
  it('writes one CSV per table with a header row', () => {
    const files = modelCsvFiles();
    expect(files.map((f) => f.name)).toContain('Sales.csv');
    expect(files.find((f) => f.name === 'Product.csv')!.content.split('\n')[0]).toBe('ProductID,Product,Category,Color,List Price,Unit Cost');
  });
  it('builds a valid zip structure', () => {
    const zip = zipFiles([{ name: 'a.txt', content: 'hello' }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(new TextDecoder().decode(zip.slice(30 + 5, 30 + 10))).toBe('hello');
  });
});
