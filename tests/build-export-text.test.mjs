import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExportText } from '../js/game-logic.mjs';

test('buildExportText shows empty state when nothing is selected', () => {
  const text = buildExportText([], new Map(), 0);
  assert.equal(text, 'Daftar Game Pesanan\n\n(Belum ada game yang dipilih)');
});

test('buildExportText formats titles and total size correctly', () => {
  const gamesByTitle = new Map([
    ['Game A', {
      title: 'Game A (Build 1234)',
      _category: 'pc',
      game_info: { 'Game Size': '12 GB' }
    }],
    ['Game B', {
      title: 'Game B',
      _category: 'ps2',
      game_info: { Platform: 'PS2', 'Game Size': '8 GB' }
    }]
  ]);

  const text = buildExportText(['Game A', 'Game B'], gamesByTitle, 20.5);

  assert.equal(
    text,
    'Daftar Game Pesanan\n\n1. Game A\n2. Game B (PS2)\n\nTotal Size: 20.5 GB'
  );
});