import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJSONField } from './js/game-logic.mjs';

function createErrorEl() {
  return { style: { display: 'block' } };
}

test('parseJSONField accepts valid JSON', () => {
  const errorEl = createErrorEl();
  const result = parseJSONField('{"genre":"Action"}', errorEl);

  assert.deepEqual(result, { genre: 'Action' });
  assert.equal(errorEl.style.display, 'none');
});

test('parseJSONField returns empty object for blank input', () => {
  const errorEl = createErrorEl();
  const result = parseJSONField('   ', errorEl);

  assert.deepEqual(result, {});
  assert.equal(errorEl.style.display, 'none');
});

test('parseJSONField rejects invalid JSON', () => {
  const errorEl = createErrorEl();
  const result = parseJSONField('{bad json}', errorEl);

  assert.equal(result, null);
  assert.equal(errorEl.style.display, 'block');
});