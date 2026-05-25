import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { formatSizeGB, parseSizeToGB } from '../js/game-logic.mjs';

test('parseSizeToGB converts GB strings directly', () => {
  assert.equal(parseSizeToGB('118.5 GB'), 118.5);
});

test('parseSizeToGB converts MB to GB', () => {
  assert.ok(Math.abs(parseSizeToGB('891 MB') - 0.8701171875) < 1e-12);
});

test('parseSizeToGB handles invalid input safely', () => {
  assert.equal(parseSizeToGB(''), 0);
  assert.equal(parseSizeToGB('unknown'), 0);
});

test('parseSizeToGB handles object with custom toString (stub)', () => {
  const stubSizeObject = {
    toString: () => '45.5 GB'
  };
  
  assert.equal(parseSizeToGB(stubSizeObject), 45.5);
});

test('formatSizeGB rounds to one decimal place', () => {
  assert.equal(formatSizeGB(1.04), '1.0 GB');
  assert.equal(formatSizeGB(1.06), '1.1 GB');
});

test('formatSizeGB calls Math.round internally (spy)', () => {
  mock.method(Math, 'round');

  const result = formatSizeGB(3.56);
  
  assert.equal(result, '3.6 GB');
  assert.equal(Math.round.mock.calls.length, 1);
  
  mock.restoreAll();
});