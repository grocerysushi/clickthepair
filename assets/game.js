/* Click the Pair game engine, shared by every game page.
   Each page describes its mode in <script type="application/json" id="game-config">. */
(() => {
  'use strict';

  const cfgEl = document.getElementById('game-config');
  const CFG = Object.assign({
    mode: 'classic',          // key for stats and best score
    name: 'Click the Pair',   // used in share text
    label: 'Classic',
    url: 'https://clickthepair.com/',
    tiles: 12,
    cols: 4,
    seconds: 60,
    penalty: 2,               // seconds lost on a wrong click (0 = none)
    pool: 'all',              // 'all' or one emoji group name
    rampAt: 10,               // score where look-alike emojis start (null = never)
    rampBase: 4,
    rampMax: 8,
    daily: false,
    bestKey: 'clickThePair.best',
    legacyBestKey: null,
    embed: false
  }, JSON.parse(cfgEl ? cfgEl.textContent : '{}'));

  const ROUND_MS = CFG.seconds * 1000;
  const PENALTY_MS = CFG.penalty * 1000;
  const TILE_COUNT = CFG.tiles;
  const COLUMNS = CFG.cols;
  const RAMP_AT = CFG.rampAt == null ? Infinity : CFG.rampAt;
  const FLASH_MS = 130;      // green flash before the next grid
  const RESULT_GUARD_MS = 600; // ignore taps on the results card right after time runs out
  const SPLITS = 6;          // daily result strip: one block per 10 seconds of the clock
  const DAILY_EPOCH = Date.UTC(2026, 10, 10);   // Daily #1 was 10 November 2026
  const DAILY_KEY = 'clickThePair.daily';      // today's daily attempt
  const STREAK_KEY = 'clickThePair.streak';    // daily streak
  const STATS_KEY = 'clickThePair.stats';      // daily history and free-play totals

  // Emoji pool, grouped so the difficulty ramp and themed boards can pull related emojis.
  // Single code point emojis only: no skin tones, flags, clock faces or near-identical faces.
  const GROUP_NAMES = ['animals', 'food', 'games', 'travel', 'nature', 'things'];
  const GROUPS = [
    '🐶 🐱 🦊 🐸 🐵 🐼 🐷 🐮 🐔 🐧 🐙 🦋 🐢 🐝 🦄 🐘 🦒 🐳 🦀 🦉',
    '🍎 🍌 🍇 🍉 🍓 🍒 🍍 🥝 🍋 🥕 🌽 🍄 🍕 🍔 🍩 🍪 🧀 🥨 🍿 🧁',
    '⚽ 🏀 🏈 🎾 🎱 🎲 🎯 🎸 🎺 🥁 🎨 🎈 🎁 🏆 🧩 🎮 🎪 🎳',
    '🚀 ⛵ 🚲 🚗 🚂 🚁 🚜 🏠 ⛺ 🗿 🗽 🎡 ⚓ 🚦 🌋 🚌 🛸 🏰',
    '🌵 🌲 🍀 🌻 🌹 🌈 ⭐ 🌙 ⛄ 🔥 💧 ⚡ 🍁 🌊 🌍 🌸 🐚',
    '🔑 🔔 💡 📌 📚 ⏰ 🎩 👑 👓 👟 🧦 💎 🧲 🔨 🎒 📷 🧸 🎀'
  ];
  // De-duplicate across groups so one emoji can never appear in two places in the pool.
  const seen = new Set();
  const groups = GROUPS.map(g => g.split(' ').filter(e => e && !seen.has(e) && seen.add(e)));
  const ALL = [...seen];
  // Holiday sets live outside GROUPS so they never change the classic or daily boards.
  const THEMES = {
    newyear: '🎉 🎊 🥳 🎆 🎇 ✨ ⏰ ⌛ 🌟 📅 🎈 🎶 🎤 🕺 💃 🎩 👑 🌃 🍇 🧨',
    valentines: '💖 💘 💝 💌 💐 🌹 🍫 🧸 💍 💋 😍 🍓 🍰 🎀 🦢 🌷 🎁 🍒 💄 🍬',
    stpatricks: '🍀 🌈 💰 🎩 🥔 🐍 🎻 🍞 🥬 🥦 🥒 🍏 💚 🐸 🏰 🐑 🧚 🎉 🥁 👢',
    easter: '🐣 🐥 🐰 🐇 🥚 🌷 🌸 🌼 🧺 🍫 🍬 🥕 🦋 🐑 🌱 🐝 🎀 🌈 🐞 🍭',
    july4: '🎆 🎇 🧨 🗽 🦅 🍔 🌭 🍉 🌽 🥧 🍦 🍗 🎈 ⭐ 🎉 🥤 🔥 🧢 ⚾ 🍟',
    halloween: '🎃 👻 🦇 💀 🧙 🧛 🧟 🍬 🍭 🍫 🌕 🦉 👽 🤡 👹 🧹 🔮 🐺 🌙 🎭',
    thanksgiving: '🦃 🥧 🌽 🍁 🍂 🥔 🍠 🥘 🍎 🍐 🍇 🥕 🍞 🧀 🍗 🥜 🌰 🍯 🏈 🥗',
    christmas: '🎄 🎅 🤶 ⛄ 🦌 🎁 🔔 🌟 🧦 🍪 🥛 🍬 🎀 🧣 🧤 🛷 👼 🍫 🎶 🧸'
  };
  const POOL = CFG.pool === 'all' ? ALL
    : THEMES[CFG.pool] ? THEMES[CFG.pool].split(' ')
    : (groups[GROUP_NAMES.indexOf(CFG.pool)] || ALL);

  const $ = id => document.getElementById(id);
  const gameCard = $('game-card');
  const grid = $('grid');
  const tiles = Array.from(grid.querySelectorAll('.tile'));
  const scoreEl = $('score');
  const bestEl = $('best');
  const bestLabel = $('best-label');
  const timeEl = $('time');
  const timeStat = $('time-stat');
  const timebar = $('timebar');
  const timebarFill = $('timebar-fill');
  const penaltyEl = $('penalty');
  const startScreen = $('start-screen');
  const dailyBtn = $('daily-btn');
  const freeBtn = $('start-btn');
  const startMeta = $('start-meta');
  const results = $('results');
  const resultTitle = $('result-title');
  const resultBest = $('result-best');
  const beatLine = $('beat-line');
  const dailyLine = $('daily-line');
  const dailyStrip = $('daily-strip');
  const stripBlocks = $('strip-blocks');
  const stripMisses = $('strip-misses');
  const againBtn = $('again-btn');
  const shareBtn = $('share-btn');
  const toDailyBtn = $('to-daily');
  const shareNote = $('share-note');
  const announcer = $('announcer');
  const statsBtn = $('stats-btn');
  const statsDialog = $('stats');
  const statsBody = $('stats-body');

  let phase = 'idle';        // idle | playing | over
  let mode = 'free';         // free | daily
  let score = 0;
  let misses = 0;
  let splits = [];
  let best = loadBest();
  let today = dayInfo();
  let dailyRun = null;       // { date, num } of the daily being played
  let shown = null;          // what the results card shows: { kind: 'free', score } or { kind: 'daily', rec }
  let rand = Math.random;    // swapped for a seeded generator on daily boards
  let values = [];           // emoji shown on each tile
  let pairEmoji = '';
  let lastPair = '';
  let firstPick = -1;        // index of the first correct tile tapped, or -1
  let locked = false;        // true during the green flash
  let endAt = 0;             // performance.now() timestamp when the round ends
  let overAt = 0;
  let shownSecs = -1;
  let rafId = 0;
  let backupId = 0;
  let nextGridId = 0;
  let penaltyId = 0;
  let shareNoteId = 0;
  const badTimers = new Map();

  // "Beat my score" links: ?beat=21 sets a target for free play
  const beat = (() => {
    const n = parseInt(new URLSearchParams(location.search).get('beat'), 10);
    return Number.isFinite(n) && n > 0 && n < 500 ? n : 0;
  })();

  bestEl.textContent = best;

  /* ---------- helpers ---------- */

  const plural = (n, one, many) => n + (n === 1 ? one : many);
  const pad = n => (n < 10 ? '0' : '') + n;
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }

  function loadBest() {
    try {
      const raw = localStorage.getItem(CFG.bestKey) || (CFG.legacyBestKey && localStorage.getItem(CFG.legacyBestKey));
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(n) {
    try { localStorage.setItem(CFG.bestKey, String(n)); } catch (e) { /* storage blocked: keep playing */ }
  }

  function readJSON(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v && typeof v === 'object' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked: keep playing */ }
  }

  // Fisher-Yates shuffle (in place)
  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }

  const sample = (list, n) => shuffle(list.slice()).slice(0, n);

  // Seeded random numbers, so every player gets the same daily boards
  function hashString(s) {
    let h = 2166136261;
    for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function seededRandom(seed) {          // mulberry32
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- stats: daily history and free-play totals ---------- */

  function readStats() {
    const s = readJSON(STATS_KEY) || {};
    return {
      daily: s.daily && typeof s.daily === 'object' ? s.daily : {},
      modes: s.modes && typeof s.modes === 'object' ? s.modes : {}
    };
  }

  function recordDaily(rec) {
    const s = readStats();
    s.daily[rec.date] = rec.score;
    const keys = Object.keys(s.daily).sort();
    while (keys.length > 120) delete s.daily[keys.shift()];
    writeJSON(STATS_KEY, s);
  }

  function recordFree(n) {
    const s = readStats();
    const m = s.modes[CFG.mode] || { games: 0, total: 0 };
    m.games += 1;
    m.total += n;
    s.modes[CFG.mode] = m;
    writeJSON(STATS_KEY, s);
  }

  /* ---------- the daily: one shared set of boards per calendar day ---------- */

  // The day runs on the player's own calendar date and turns over at their local midnight.
  function dayInfo() {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    const utc = Date.UTC(y, m, day);
    return {
      utc,
      key: iso(utc),
      yesterday: iso(utc - 864e5),
      num: Math.max(1, Math.round((utc - DAILY_EPOCH) / 864e5) + 1),
      nextAt: new Date(y, m, day + 1).getTime()
    };
  }

  function todaysRecord() {
    if (!CFG.daily) return null;
    const r = readJSON(DAILY_KEY);
    return r && r.date === today.key ? r : null;
  }

  function streakNow() {
    const s = readJSON(STREAK_KEY);
    if (!s) return { current: 0, max: 0, played: 0 };
    const alive = s.last === today.key || s.last === today.yesterday;
    return { current: alive ? (s.current || 0) : 0, max: s.max || 0, played: s.played || 0 };
  }

  function bumpStreak() {
    const s = readJSON(STREAK_KEY) || {};
    if (s.last === today.key) return;
    const current = s.last === today.yesterday ? (s.current || 0) + 1 : 1;
    writeJSON(STREAK_KEY, { last: today.key, current, max: Math.max(current, s.max || 0), played: (s.played || 0) + 1 });
  }

  // Saved after every point and miss, so leaving mid-round still uses up the day's try.
  function saveDaily(done) {
    const rec = { date: dailyRun.date, num: dailyRun.num, score, misses, splits: splits.slice(), done };
    writeJSON(DAILY_KEY, rec);
    if (done) recordDaily(rec);
    return rec;
  }

  // 🟩 4+ pairs, 🟨 2-3, 🟥 0-1 in each 10 seconds of the clock
  const stripFor = list => Array.from({ length: SPLITS }, (_, i) => {
    const n = (list && list[i]) || 0;
    return n >= 4 ? '🟩' : n >= 2 ? '🟨' : '🟥';
  }).join('');

  function countdown(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 3600) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
  }

  /* ---------- grid ---------- */

  // Returns the board: TILE_COUNT - 1 distinct emojis plus exactly one duplicate.
  function buildGrid() {
    rand = mode === 'daily'
      ? seededRandom(hashString('click-the-pair:' + dailyRun.date + ':' + score))
      : Math.random;
    const wanted = TILE_COUNT - 1;
    let distinct;
    if (score >= RAMP_AT) {
      // Difficulty ramp: several tiles come from one group, and the pair is one of them.
      const group = groups[Math.floor(rand() * groups.length)];
      const sameGroup = Math.min(CFG.rampBase + Math.floor((score - RAMP_AT) / 3), CFG.rampMax, group.length, wanted);
      const others = ALL.filter(e => !group.includes(e));
      distinct = sample(group, sameGroup).concat(sample(others, wanted - sameGroup));
    } else {
      distinct = sample(POOL, wanted);
    }
    let pair = distinct[0];
    if (pair === lastPair) pair = distinct[1];   // never the same pair twice in a row
    lastPair = pair;
    pairEmoji = pair;
    return shuffle(distinct.concat(pair));
  }

  function nextGrid() {
    if (phase !== 'playing') return;
    values = buildGrid();
    firstPick = -1;
    locked = false;
    tiles.forEach((tile, i) => {
      clearBad(tile);
      tile.className = 'tile';
      tile.textContent = values[i];
      tile.setAttribute('aria-pressed', 'false');
    });
  }

  function clearBad(tile) {
    const t = badTimers.get(tile);
    if (t) { clearTimeout(t); badTimers.delete(tile); }
    tile.classList.remove('is-bad');
  }

  function onTile(index) {
    if (phase !== 'playing' || locked) return;
    const tile = tiles[index];

    if (values[index] !== pairEmoji) {            // wrong tile
      misses += 1;
      if (PENALTY_MS) {
        endAt -= PENALTY_MS;
        penaltyEl.classList.add('is-on');
        clearTimeout(penaltyId);
        penaltyId = setTimeout(() => penaltyEl.classList.remove('is-on'), 600);
      }
      if (mode === 'daily') saveDaily(false);
      clearBad(tile);
      void tile.offsetWidth;                      // restart the shake if tapped twice
      tile.classList.add('is-bad');
      badTimers.set(tile, setTimeout(() => clearBad(tile), 200));
      tick();
      return;
    }

    if (index === firstPick) return;              // already selected

    if (firstPick === -1) {                       // first half of the pair
      firstPick = index;
      tile.classList.add('is-picked');
      tile.setAttribute('aria-pressed', 'true');
      return;
    }

    // Second half of the pair: score it
    score += 1;
    const used = ROUND_MS - (endAt - performance.now());
    splits[Math.min(SPLITS - 1, Math.max(0, Math.floor(used / (ROUND_MS / SPLITS))))] += 1;
    if (mode === 'daily') saveDaily(false);
    scoreEl.textContent = score;
    locked = true;
    const first = tiles[firstPick];
    first.classList.remove('is-picked');
    first.classList.add('is-good');
    tile.classList.add('is-good');
    nextGridId = setTimeout(nextGrid, FLASH_MS);
  }

  grid.addEventListener('click', e => {
    const tile = e.target.closest('.tile');
    if (tile) onTile(tiles.indexOf(tile));
  });

  // Arrow keys move between tiles (Tab works too; Enter/Space are native button behaviour)
  grid.addEventListener('keydown', e => {
    const i = tiles.indexOf(document.activeElement);
    if (i === -1) return;
    const col = i % COLUMNS;
    let to = -1;
    if (e.key === 'ArrowRight' && col < COLUMNS - 1) to = i + 1;
    else if (e.key === 'ArrowLeft' && col > 0) to = i - 1;
    else if (e.key === 'ArrowDown' && i + COLUMNS < TILE_COUNT) to = i + COLUMNS;
    else if (e.key === 'ArrowUp' && i - COLUMNS >= 0) to = i - COLUMNS;
    else if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    if (to !== -1) tiles[to].focus();
  });

  /* ---------- timer: deadline based, so it cannot drift ---------- */

  function paintTime(left) {
    const secs = Math.max(0, Math.ceil(left / 1000));
    if (secs !== shownSecs) {
      shownSecs = secs;
      timeEl.textContent = secs;
      const low = secs <= 10;
      timeStat.classList.toggle('is-low', low);
      timebar.classList.toggle('is-low', low);
    }
    timebarFill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, left / ROUND_MS)).toFixed(4) + ')';
  }

  function tick() {
    if (phase !== 'playing') return;
    const left = endAt - performance.now();
    if (left <= 0) { finish(); return; }
    paintTime(left);
  }

  function frame() {
    tick();
    if (phase === 'playing') rafId = requestAnimationFrame(frame);
  }

  /* ---------- start screen and results ---------- */

  function refreshStart() {
    const rec = todaysRecord();
    if (dailyBtn) dailyBtn.textContent = rec ? 'Today’s result' : 'Daily #' + today.num;
    if (!startMeta) return;
    if (beat) {
      startMeta.textContent = '🎯 A friend found ' + plural(beat, ' pair', ' pairs') + '. Can you beat it?';
    } else if (CFG.daily && rec) {
      startMeta.textContent = 'Daily #' + today.num + ' done. Next one in ' + countdown(today.nextAt - Date.now());
    } else if (CFG.daily) {
      const st = streakNow();
      startMeta.textContent = st.current
        ? '🔥 ' + st.current + '-day streak. Play today to keep it going.'
        : 'Same boards for everyone today. One try.';
    } else {
      startMeta.textContent = best ? 'Your best here: ' + plural(best, ' pair', ' pairs') + '.' : 'New boards every round.';
    }
  }

  function refreshToDaily() {
    if (!toDailyBtn) return;
    toDailyBtn.hidden = !CFG.daily || !!todaysRecord();
    toDailyBtn.textContent = 'Play today’s Daily #' + today.num;
  }

  function renderDailyLine() {
    if (!shown || shown.kind !== 'daily' || !dailyLine) return;
    const parts = [];
    const st = streakNow();
    if (st.current) parts.push('🔥 ' + st.current + '-day streak');
    if (shown.rec.date === today.key) parts.push('Next in ' + countdown(today.nextAt - Date.now()));
    dailyLine.textContent = parts.join(' · ');
  }

  function resetShare() {
    clearTimeout(shareNoteId);
    shareBtn.textContent = 'Share';
    shareNote.textContent = '';
  }

  function openResults(focusEl) {
    resetShare();
    refreshToDaily();
    startScreen.hidden = true;
    results.hidden = false;
    focusEl.focus({ preventScroll: true });
  }

  function showFree(isNewBest) {
    shown = { kind: 'free', score };
    results.classList.remove('is-daily');
    resultTitle.textContent = 'Time’s up!';
    $('final-score').textContent = score;
    $('final-unit').textContent = score === 1 ? 'pair' : 'pairs';
    $('final-best').textContent = best;
    $('new-best').hidden = !isNewBest;
    if (beatLine) beatLine.textContent = beat ? (score > beat ? ' · You beat ' + beat + '!' : ' · Friend: ' + beat) : '';
    resultBest.hidden = false;
    if (dailyLine) dailyLine.hidden = true;
    if (dailyStrip) dailyStrip.hidden = true;
    againBtn.textContent = 'Play Again';
    againBtn.className = 'btn';
    shareBtn.className = 'btn btn--ghost';
    openResults(againBtn);
  }

  function showDaily(rec) {
    shown = { kind: 'daily', rec };
    results.classList.add('is-daily');
    resultTitle.textContent = 'Daily #' + rec.num;
    $('final-score').textContent = rec.score;
    $('final-unit').textContent = rec.score === 1 ? 'pair' : 'pairs';
    resultBest.hidden = true;
    dailyLine.hidden = false;
    dailyStrip.hidden = false;
    renderDailyLine();
    stripBlocks.textContent = stripFor(rec.splits);
    stripMisses.textContent = rec.misses ? plural(rec.misses, ' miss', ' misses') : 'no misses';
    againBtn.textContent = 'Free play';
    againBtn.className = 'btn btn--ghost';
    shareBtn.className = 'btn';
    openResults(shareBtn);
  }

  // Keeps the countdowns live and notices when a new day's daily opens.
  function clock() {
    if (phase === 'playing') return;
    if (Date.now() >= today.nextAt) today = dayInfo();
    refreshStart();
    if (!results.hidden) { renderDailyLine(); refreshToDaily(); }
  }

  /* ---------- stats panel ---------- */

  function statTile(value, label) {
    return '<div class="stat-tile"><strong>' + value + '</strong><span>' + label + '</span></div>';
  }

  function renderStats() {
    const s = readStats();
    let html = '';
    if (CFG.daily) {
      const dates = Object.keys(s.daily).sort();
      const scores = dates.map(k => s.daily[k]);
      const st = streakNow();
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '–';
      html += '<h3>Daily challenge</h3><div class="stat-tiles">' +
        statTile(dates.length, 'Played') +
        statTile(st.current, 'Streak') +
        statTile(Math.max(st.max, st.current), 'Best streak') +
        statTile(avg, 'Average') +
        statTile(scores.length ? Math.max(...scores) : '–', 'Best') +
        '</div>';
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const t = today.utc - i * 864e5;
        const v = s.daily[iso(t)];
        days.push({ v: typeof v === 'number' ? v : null, label: new Date(t).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) });
      }
      const top = Math.max(1, ...days.map(d => d.v || 0));
      const spoken = days.map(d => d.label + ' ' + (d.v == null ? 'not played' : d.v)).join(', ');
      html += '<h3>Last 7 days</h3><div class="week" role="img" aria-label="Daily scores: ' + spoken + '">' +
        days.map(d => '<div class="week__day" aria-hidden="true"><span class="week__val">' + (d.v == null ? '–' : d.v) +
          '</span><span class="week__bar' + (d.v == null ? ' is-empty' : '') + '" style="height:' +
          (d.v == null ? 4 : Math.max(8, Math.round(d.v / top * 80))) + '%"></span><span class="week__label">' + d.label + '</span></div>').join('') +
        '</div>';
    }
    const m = s.modes[CFG.mode] || { games: 0, total: 0 };
    html += '<h3>' + (CFG.daily ? 'Free play' : CFG.label + ' free play') + '</h3><div class="stat-tiles">' +
      statTile(m.games, 'Games') +
      statTile(m.games ? (m.total / m.games).toFixed(1) : '–', 'Average') +
      statTile(best || '–', 'Best') +
      '</div>';
    statsBody.innerHTML = html;
  }

  if (statsBtn && statsDialog) {
    statsBtn.addEventListener('click', () => {
      renderStats();
      if (typeof statsDialog.showModal === 'function') statsDialog.showModal();
      else statsDialog.setAttribute('open', '');
    });
    statsDialog.addEventListener('click', e => {        // click on the dimmed backdrop closes it
      if (e.target === statsDialog && typeof statsDialog.close === 'function') statsDialog.close();
    });
    const closeBtn = $('stats-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (typeof statsDialog.close === 'function') statsDialog.close(); else statsDialog.removeAttribute('open');
    });
  }

  /* ---------- round lifecycle ---------- */

  function start(kind) {
    today = dayInfo();
    if (kind === 'daily' && CFG.daily) {
      const rec = todaysRecord();
      if (rec) { showDaily(rec); return; }      // today's try is used up: show the result instead
      mode = 'daily';
      dailyRun = { date: today.key, num: today.num };
      bumpStreak();
    } else {
      mode = 'free';
      dailyRun = null;
    }

    clearTimeout(nextGridId);
    cancelAnimationFrame(rafId);
    clearInterval(backupId);

    phase = 'playing';
    score = 0;
    misses = 0;
    splits = new Array(SPLITS).fill(0);
    lastPair = '';
    shownSecs = -1;
    scoreEl.textContent = '0';
    if (mode === 'daily') {
      if (bestLabel) bestLabel.textContent = 'Streak';
      bestEl.textContent = streakNow().current;
      saveDaily(false);
    } else {
      if (bestLabel) bestLabel.textContent = 'Best';
      bestEl.textContent = best;
    }
    penaltyEl.classList.remove('is-on');
    startScreen.hidden = true;
    results.hidden = true;
    announcer.textContent = '';

    tiles.forEach(tile => { tile.disabled = false; });
    nextGrid();

    endAt = performance.now() + ROUND_MS;
    paintTime(ROUND_MS);
    rafId = requestAnimationFrame(frame);
    backupId = setInterval(tick, 250);   // keeps the clock honest if frames are throttled

    // Bring the whole board into view (matters on small phones), then hand focus to the grid
    gameCard.scrollIntoView({ block: 'nearest' });
    tiles[0].focus({ preventScroll: true });
  }

  function finish() {
    phase = 'over';
    overAt = performance.now();
    cancelAnimationFrame(rafId);
    clearInterval(backupId);
    clearTimeout(nextGridId);
    clearTimeout(penaltyId);
    penaltyEl.classList.remove('is-on');
    paintTime(0);
    tiles.forEach(tile => { tile.disabled = true; });

    if (mode === 'daily') {
      const rec = saveDaily(true);
      showDaily(rec);
      announcer.textContent = 'Time’s up. Daily number ' + rec.num + ': ' + plural(rec.score, ' pair', ' pairs') +
        ', ' + plural(rec.misses, ' miss', ' misses') + '.';
      return;
    }

    recordFree(score);
    const isNewBest = score > best;
    if (isNewBest) { best = score; saveBest(best); }
    bestEl.textContent = best;
    showFree(isNewBest);
    announcer.textContent = 'Time’s up. You found ' + plural(score, ' pair', ' pairs') + '. Best score: ' + best + '.';
  }

  // Stops a last-moment tile tap from landing on the results buttons
  const guarded = fn => () => { if (performance.now() - overAt >= RESULT_GUARD_MS) fn(); };

  if (dailyBtn) dailyBtn.addEventListener('click', () => start('daily'));
  freeBtn.addEventListener('click', () => start('free'));
  againBtn.addEventListener('click', guarded(() => start('free')));
  if (toDailyBtn) toDailyBtn.addEventListener('click', guarded(() => start('daily')));

  // A friend's challenge link puts free play first
  if (beat && dailyBtn) {
    freeBtn.className = 'btn';
    dailyBtn.className = 'btn btn--ghost';
  }

  // A daily left mid-round counts as played.
  const unfinished = todaysRecord();
  if (unfinished) {
    if (!unfinished.done) writeJSON(DAILY_KEY, Object.assign(unfinished, { done: true }));
    recordDaily(unfinished);
  }
  refreshStart();
  setInterval(clock, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    tick();
    clock();
  });

  /* ---------- share ---------- */

  function copyText(text, focusAfter) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => legacyCopy(text, focusAfter));
    }
    return legacyCopy(text, focusAfter);
  }

  function legacyCopy(text, focusAfter) {
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (focusAfter) focusAfter.focus({ preventScroll: true });
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function shareMessage() {
    const base = CFG.url;
    if (shown && shown.kind === 'daily') {
      const r = shown.rec;
      const st = streakNow();
      const when = new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const url = base + '?daily';
      const lines = [
        'Click the Pair · Daily #' + r.num + ' · ' + when,
        '🎯 ' + plural(r.score, ' pair', ' pairs') + ' · ❌ ' + plural(r.misses, ' miss', ' misses'),
        stripFor(r.splits)
      ];
      if (st.current >= 2) lines.push('🔥 ' + st.current + '-day streak');
      const text = lines.join('\n');
      return { text, url, full: text + '\n' + url };
    }
    const n = shown ? shown.score : score;
    const text = 'I found ' + plural(n, ' pair', ' pairs') + ' in 60 seconds on ' + CFG.name + '.' + (n > 0 ? ' Can you beat it?' : '');
    const url = n > 0 ? base + '?beat=' + n : base;
    return { text, url, full: text + ' ' + url };
  }

  async function share() {
    const msg = shareMessage();
    const touchDevice = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    if (navigator.share && touchDevice) {
      try {
        await navigator.share({ title: 'Click the Pair', text: msg.text, url: msg.url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;   // player closed the share sheet
      }
    }

    clearTimeout(shareNoteId);
    try {
      await copyText(msg.full, shareBtn);
      shareBtn.textContent = 'Copied!';
      shareNote.textContent = 'Result copied. Paste it anywhere.';
      shareNoteId = setTimeout(resetShare, 2200);
    } catch (e) {
      shareNote.textContent = msg.full;             // let the player copy it by hand
      if (toDailyBtn) toDailyBtn.hidden = true;     // make room for the text on small screens
    }
  }

  shareBtn.addEventListener('click', guarded(share));

  /* ---------- embed code copy button (home page) ---------- */

  const embedCopy = $('embed-copy');
  const embedCode = $('embed-code');
  if (embedCopy && embedCode) {
    embedCopy.addEventListener('click', () => {
      copyText(embedCode.value, embedCopy).then(() => {
        embedCopy.textContent = 'Copied!';
        setTimeout(() => { embedCopy.textContent = 'Copy code'; }, 2000);
      }, () => {
        embedCode.focus();
        embedCode.select();
      });
    });
  }

  /* ---------- holiday boards: switch on and off by date, no redeploy needed ---------- */

  // US Thanksgiving: the fourth Thursday of November
  function thanksgivingDay(year) {
    const first = new Date(year, 10, 1).getDay();
    return new Date(year, 10, 1 + (4 - first + 7) % 7 + 21);
  }
  // Western Easter Sunday (the Anonymous Gregorian algorithm)
  function easterDay(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(y, Math.floor(n / 31) - 1, n % 31 + 1);
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  // Each season's first and last day, inclusive, in the player's local time.
  // A season may run into the next year (New Year's), so both this year's and last year's ranges are checked.
  const SEASONS = {
    newyear: y => [new Date(y, 11, 26), new Date(y + 1, 0, 5)],                  // Dec 26 to Jan 5
    valentines: y => [new Date(y, 1, 1), new Date(y, 1, 14)],                    // Feb 1 to Feb 14
    stpatricks: y => [new Date(y, 2, 1), new Date(y, 2, 17)],                    // Mar 1 to Mar 17
    easter: y => [addDays(easterDay(y), -14), addDays(easterDay(y), 1)],         // two weeks before, to Easter Monday
    july4: y => [new Date(y, 5, 20), new Date(y, 6, 5)],                         // Jun 20 to Jul 5
    halloween: y => [new Date(y, 9, 1), new Date(y, 9, 31)],                     // Oct 1 to Oct 31
    thanksgiving: y => [new Date(y, 10, 1), addDays(thanksgivingDay(y), 1)],     // Nov 1 to Black Friday
    christmas: y => [addDays(thanksgivingDay(y), 2), new Date(y, 11, 25)]        // the weekend after, to Dec 25
  };
  function seasonToday() {
    // Local testing only: ?today=2026-12-05 pretends it is that date
    const fake = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) &&
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(new URLSearchParams(location.search).get('today') || '');
    const now = new Date();
    return fake ? new Date(+fake[1], fake[2] - 1, +fake[3]) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  function inSeason(name, day) {
    if (!SEASONS[name]) return false;
    return [day.getFullYear(), day.getFullYear() - 1].some(y => {
      const range = SEASONS[name](y);
      return day >= range[0] && day <= range[1];
    });
  }

  const seasonal = $('seasonal');
  if (seasonal) {
    const day = seasonToday();
    let anyShown = false;
    let promoCard = null;
    seasonal.querySelectorAll('li[data-season]').forEach(li => {
      const card = li.querySelector('a');
      const current = card.getAttribute('aria-current') === 'page';
      const live = inSeason(li.dataset.season, day);
      li.hidden = !(live || current);
      if (!li.hidden) anyShown = true;
      if (live && !current && !promoCard) promoCard = card;
    });
    seasonal.hidden = !anyShown;
    // Point the start screen at the holiday board that is in season
    const promo = $('season-promo');
    if (promo && promoCard) {
      promo.href = promoCard.getAttribute('href');
      promo.textContent = promoCard.querySelector('.mode-card__icon').textContent + ' Try the ' +
        promoCard.querySelector('strong').textContent + ' board';
      promo.hidden = false;
    }
  }

  /* ---------- offline play ---------- */

  if ('serviceWorker' in navigator && !CFG.embed &&
      (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
})();
