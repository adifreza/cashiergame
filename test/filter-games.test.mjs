import test from "node:test";
import assert from "node:assert/strict";
import {
  filterGames,
  normalizeBufferPercentage,
  parseJSONField,
  shouldProcessGame,
} from "../js/game-logic.mjs";

test("normalizeBufferPercentage clamps values to 0 and 100", () => {
  assert.equal(normalizeBufferPercentage(-10), 0);
  assert.equal(normalizeBufferPercentage(150), 100);
});

test("normalizeBufferPercentage falls back to default when input is invalid", () => {
  assert.equal(normalizeBufferPercentage("abc"), 5);
});

test("parseJSONField hides error element when JSON is valid", () => {
  const fakeErrorEl = { style: { display: "block" } };
  const result = parseJSONField('{"a":1}', fakeErrorEl);

  assert.deepEqual(result, { a: 1 });
  assert.equal(fakeErrorEl.style.display, "none");
});

test("parseJSONField shows error element when JSON is invalid", () => {
  const fakeErrorEl = { style: { display: "none" } };
  const result = parseJSONField("not-json", fakeErrorEl);

  assert.equal(result, null);
  assert.equal(fakeErrorEl.style.display, "block");
});

test("shouldProcessGame skips SteamStatic banners and allows empty banners", () => {
  assert.equal(shouldProcessGame({ title: "Any Game", banner_url: "" }), true);
  assert.equal(
    shouldProcessGame({
      title: "Any Game",
      banner_url: "https://steamstatic.com/image.jpg",
    }),
    false,
  );
});

test("filterGames filters by query, category, and keeps PC entries first for all categories", () => {
  const games = [
    { title: "PS2 Action", _category: "ps2", _index: 0 },
    { title: "PC Adventure", _category: "pc", _index: 1 },
    { title: "PC Racing", _category: "pc", _index: 2 },
    { title: "PS2 Racing", _category: "ps2", _index: 3 },
  ];

  const filteredAll = filterGames(games, "racing", "all");
  assert.deepEqual(
    filteredAll.map((game) => game.title),
    ["PC Racing", "PS2 Racing"],
  );

  const filteredPs2 = filterGames(games, "", "ps2");
  assert.deepEqual(
    filteredPs2.map((game) => game.title),
    ["PS2 Action", "PS2 Racing"],
  );
});
