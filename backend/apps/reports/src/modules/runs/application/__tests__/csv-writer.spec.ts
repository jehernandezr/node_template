import { CsvWriter } from '../csv-writer.js';

describe('CsvWriter', () => {
  it('joins cells with commas and lines with CRLF', () => {
    expect(
      CsvWriter.write([
        ['estado', 'tareas'],
        ['open', '3'],
      ]),
    ).toBe('estado,tareas\r\nopen,3');
  });

  it('quotes cells with commas, quotes or line breaks and doubles inner quotes', () => {
    expect(CsvWriter.write([['a,b', 'di "hola"', 'uno\ndos']])).toBe(
      '"a,b","di ""hola""","uno\ndos"',
    );
  });

  it('defuses cells that a spreadsheet would run as a formula', () => {
    expect(CsvWriter.write([['=SUM(A1)', '-3', '@cmd']])).toBe(
      "'=SUM(A1),'-3,'@cmd",
    );
  });
});
