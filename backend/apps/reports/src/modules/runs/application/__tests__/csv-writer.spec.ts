import { CsvWriter } from '../csv-writer.js';

describe('CsvWriter', () => {
  it('joins cells with commas and lines with CRLF', () => {
    expect(
      CsvWriter.write([
        ['status', 'tasks'],
        ['open', '3'],
      ]),
    ).toBe('status,tasks\r\nopen,3');
  });

  it('quotes cells with commas, quotes or line breaks and doubles inner quotes', () => {
    expect(CsvWriter.write([['a,b', 'say "hello"', 'one\ntwo']])).toBe(
      '"a,b","say ""hello""","one\ntwo"',
    );
  });

  it('defuses cells that a spreadsheet would run as a formula', () => {
    expect(CsvWriter.write([['=SUM(A1)', '-3', '@cmd']])).toBe(
      "'=SUM(A1),'-3,'@cmd",
    );
  });
});
