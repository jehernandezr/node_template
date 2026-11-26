import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import config from '../../../commitlint.config.mjs';

const rule = config.plugins[0].rules['no-ai-attribution'];

describe('commitlint no-ai-attribution', () => {
  it('rejects a Co-Authored-By or generated-by line', () => {
    for (const raw of [
      'feat: add a guard\n\nCo-Authored-By: Someone <someone@example.com>\n',
      'feat: add a guard\n\nGenerated with a tool\n',
    ]) {
      assert.equal(rule({ raw })[0], false, raw);
    }
  });

  it('accepts a message that only describes the change', () => {
    assert.equal(
      rule({ raw: 'feat: add a guard\n\nThe gate runs it.\n' })[0],
      true,
    );
  });
});
