const MANUAL_GAME_IDS = new Set([
  'resident evil 4 remake',
  'resident evil 4',
  'resident evil 2',
  'resident evil 2 remake',
  'resident evil 3',
  'resident evil 3 remake',
  'silent hill 2',
  'silent hill 2 remake',
  'dead space',
  'dead space remake',
  'system shock',
  'system shock remake',
  'resident evil biohazard hd remaster',
  'resident evil hd remaster',
  'resident evil hd',
]);

export function parseSizeToGB(sizeStr) {
  if (!sizeStr) return 0;

  const text = String(sizeStr).replace(',', '.').toUpperCase();
  const match = text.match(/\d+(?:\.\d+)?/);
  const value = match ? Number.parseFloat(match[0]) : Number.NaN;

  if (Number.isNaN(value)) return 0;
  if (text.includes('MB')) return value / 1024;
  if (text.includes('KB')) return value / (1024 * 1024);
  return value;
}

export function formatSizeGB(sizeGB) {
  const safe = Number.isFinite(sizeGB) ? sizeGB : 0;
  const rounded = Math.round((safe + Number.EPSILON) * 10) / 10;
  return `${rounded.toFixed(1)} GB`;
}

export function normalizeBufferPercentage(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(100, Math.max(0, parsed));
}

export function parseJSONField(valueStr, errorEl) {
  if (!String(valueStr ?? '').trim()) {
    if (errorEl?.style) errorEl.style.display = 'none';
    return {};
  }

  try {
    const parsed = JSON.parse(valueStr);
    if (errorEl?.style) errorEl.style.display = 'none';
    return parsed;
  } catch {
    if (errorEl?.style) errorEl.style.display = 'block';
    return null;
  }
}

export function stripVersionSuffix(title) {
  if (!title) return '';

  let text = String(title).trim();
  const versionSuffixRe = /\s*\((?:\s*(?:v\s*\d|build\b|Build\b|B_\d|b_\d)[^)]*)\)\s*$/;

  while (versionSuffixRe.test(text)) {
    text = text.replace(versionSuffixRe, '').trim();
  }

  return text;
}

export function needsPs2Suffix(game) {
  if (!game) return false;
  if (game._category === 'ps2') return true;

  const platform = game.game_info ? String(game.game_info.Platform || '') : '';
  return platform.toUpperCase().includes('PS2');
}

export function formatExportTitle(game) {
  const title = stripVersionSuffix(game && game.title ? game.title : 'Untitled');

  if (!needsPs2Suffix(game)) return title;
  if (/\(PS2\)\s*$/i.test(title)) return title;

  return `${title} (PS2)`;
}

export function buildExportText(selectedTitles, gamesByTitle, totalUsedGB) {
  const selectedArr = Array.from(selectedTitles || [])
    .map((title) => gamesByTitle.get(title))
    .filter(Boolean);

  if (selectedArr.length === 0) {
    return 'Daftar Game Pesanan\n\n(Belum ada game yang dipilih)';
  }

  const lines = ['Daftar Game Pesanan', ''];

  selectedArr.forEach((game, index) => {
    lines.push(`${index + 1}. ${formatExportTitle(game)}`);
  });

  lines.push('');
  lines.push(`Total Size: ${Number(totalUsedGB || 0).toFixed(1)} GB`);
  return lines.join('\n');
}

export function filterGames(games, query, category) {
  const normalizedQuery = String(query ?? '').toLowerCase().trim();
  const normalizedCategory = category || 'all';

  const filtered = (Array.isArray(games) ? games : []).filter((game) => {
    if (!game) return false;

    const title = String(game.title || '').toLowerCase();
    const matchesQuery = !normalizedQuery || title.includes(normalizedQuery);
    const matchesCategory = normalizedCategory === 'all' || game._category === normalizedCategory;

    return matchesQuery && matchesCategory;
  });

  if (normalizedCategory !== 'all') {
    return filtered;
  }

  return filtered.slice().sort((a, b) => {
    if (a._category === b._category) {
      return (a._index || 0) - (b._index || 0);
    }

    if (a._category === 'pc') return -1;
    if (b._category === 'pc') return 1;
    return 0;
  });
}

export function shouldProcessGame(game) {
  const title = game && game.title ? game.title : '';
  const cleanedTitle = cleanTitle(title);

  if (MANUAL_GAME_IDS.has(cleanedTitle.toLowerCase().trim())) {
    return true;
  }

  const bannerUrl = game && game.banner_url ? String(game.banner_url).trim() : '';
  if (!bannerUrl) return true;
  if (bannerUrl.toLowerCase().includes('steamstatic')) return false;
  return true;
}

export function cleanTitle(title) {
  let text = stripVersionSuffix(title);
  if (!text) return '';

  text = text.replace(/\//g, ' ').replace(/\\/g, ' ');
  text = text.replace(/\bonline\b/gi, '');
  text = text.replace(/\bmultiplayer\b/gi, '');
  text = text.replace(/\bco[- ]?op\b/gi, '');
  text = text.replace(/\bfree download\b/gi, '');
  text = text.replace(/\(\s*\+\s*\)/g, '');
  text = text.replace(/\+\s*\)/g, ')');
  text = text.replace(/\(\s*\)/g, '');
  text = text.replace(/[:\-–—]+\s*$/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}