/*
 * PSO2 マグ育成 計算ロジック
 * 必要ポイントは PSO2（EP6時点）の仕様に基づく。
 *   支援Lv  0-49 : 30pt/level
 *          50-59 : 70pt/level
 *          60-69 : 90pt/level
 *          70-79 : 110pt/level
 *          80-89 : 130pt/level
 *          90-99 : 150pt/level
 *         100-109: 180pt/level
 *         110-119: 210pt/level
 *         120-199: 240pt/level
 *   累計Lv200 = 30,100pt
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MagCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_LEVEL = 200;
  var MAX_POINTS = 30100;

  // 表示順 = レベルアップ時の優先順（打 > 射 > 法 > 技 > 打防 > 射防 > 法防）
  var STATS = [
    { key: 'mst', name: '打撃', short: '打' },
    { key: 'rng', name: '射撃', short: '射' },
    { key: 'tec', name: '法撃', short: '法' },
    { key: 'dex', name: '技量', short: '技' },
    { key: 'mdef', name: '打撃防御', short: '打防' },
    { key: 'rdef', name: '射撃防御', short: '射防' },
    { key: 'tdef', name: '法撃防御', short: '法防' }
  ];

  function cumPoints(level) {
    if (level <= 0) return 0;
    if (level <= 50) return 30 * level;
    if (level <= 60) return 1500 + 70 * (level - 50);
    if (level <= 70) return 2200 + 90 * (level - 60);
    if (level <= 80) return 3100 + 110 * (level - 70);
    if (level <= 90) return 4200 + 130 * (level - 80);
    if (level <= 100) return 5500 + 150 * (level - 90);
    if (level <= 110) return 7000 + 180 * (level - 100);
    if (level <= 120) return 8800 + 210 * (level - 110);
    if (level <= MAX_LEVEL) return 10900 + 240 * (level - 120);
    return MAX_POINTS;
  }

  function levelFromPoints(points) {
    var p = Math.max(0, Math.min(MAX_POINTS, points));
    var lo = 0;
    var hi = MAX_LEVEL;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      if (cumPoints(mid) <= p) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function createState(levels) {
    var state = [];
    for (var i = 0; i < STATS.length; i++) {
      var lv = Math.max(0, Math.min(MAX_LEVEL, levels[i] || 0));
      state.push({ level: lv, points: cumPoints(lv) });
    }
    return state;
  }

  function cloneState(state) {
    return state.map(function (s) {
      return { level: s.level, points: s.points };
    });
  }

  function totalLevel(state) {
    return state.reduce(function (a, s) { return a + s.level; }, 0);
  }

  // ゲージが溜まっているステータスを優先順にレベルアップさせる。
  // 合計レベルが cap に達したらそれ以上は上がらない。
  function resolveLevels(state, cap) {
    var guard = 0;
    while (guard++ < 5000) {
      if (totalLevel(state) >= cap) break;
      var idx = -1;
      for (var i = 0; i < STATS.length; i++) {
        var s = state[i];
        if (s.level < MAX_LEVEL && s.points >= cumPoints(s.level + 1)) {
          idx = i;
          break;
        }
      }
      if (idx < 0) break;
      state[idx].level += 1;
    }
  }

  // item を times 個与える。戻り値は実際に与えられた個数。
  function feed(state, item, times, cap) {
    cap = cap || MAX_LEVEL;
    var fed = 0;
    for (var n = 0; n < times; n++) {
      if (totalLevel(state) >= cap) break;
      for (var i = 0; i < STATS.length; i++) {
        var d = item.delta[i];
        if (!d) continue;
        var floor = cumPoints(state[i].level); // マイナス値でもレベルは下がらない
        var p = state[i].points + d;
        if (p < floor) p = floor;
        if (p > MAX_POINTS) p = MAX_POINTS;
        state[i].points = p;
      }
      fed++;
      resolveLevels(state, cap);
    }
    return fed;
  }

  // アイテムだけを与え続けて target レベルに到達する個数を求める。
  function simulateToLevel(startState, item, target, cap) {
    cap = cap || MAX_LEVEL;
    target = Math.max(0, Math.min(MAX_LEVEL, target));
    var st = cloneState(startState);
    if (totalLevel(st) >= target) {
      return { count: 0, state: st, reached: true };
    }

    var count = 0;
    var limit = 200000;
    while (count < limit) {
      var before = totalLevel(st);
      feed(st, item, 1, cap);
      count++;
      if (totalLevel(st) >= target) {
        return { count: count, state: st, reached: true };
      }
      if (totalLevel(st) === before) {
        var canGrow = false;
        for (var i = 0; i < STATS.length; i++) {
          if (item.delta[i] > 0 && st[i].level < MAX_LEVEL) {
            canGrow = true;
            break;
          }
        }
        if (!canGrow) {
          return { count: Infinity, state: st, reached: false };
        }
      }
    }
    return { count: Infinity, state: st, reached: false };
  }

  function it(group, name, delta) {
    return { group: group, name: name, delta: delta };
  }

  var ITEMS = [
    // --- フードデバイス（ミニ）---
    it('フードデバイス（ミニ）', 'フードデバイス/打撃ミニ', [60, 0, 0, 0, 0, 0, 0]),
    it('フードデバイス（ミニ）', 'フードデバイス/射撃ミニ', [0, 60, 0, 0, 0, 0, 0]),
    it('フードデバイス（ミニ）', 'フードデバイス/法撃ミニ', [0, 0, 60, 0, 0, 0, 0]),
    it('フードデバイス（ミニ）', 'フードデバイス/技量ミニ', [0, 0, 0, 60, 0, 0, 0]),

    // --- フードデバイス（通常）---
    it('フードデバイス（通常）', 'フードデバイス/打撃', [720, 0, 0, 0, 0, 0, 0]),
    it('フードデバイス（通常）', 'フードデバイス/射撃', [0, 720, 0, 0, 0, 0, 0]),
    it('フードデバイス（通常）', 'フードデバイス/法撃', [0, 0, 720, 0, 0, 0, 0]),
    it('フードデバイス（通常）', 'フードデバイス/技量', [0, 0, 0, 720, 0, 0, 0]),
    it('フードデバイス（通常）', 'フードデバイス/打撃防御', [0, 0, 0, 0, 720, 0, 0]),
    it('フードデバイス（通常）', 'フードデバイス/射撃防御', [0, 0, 0, 0, 0, 720, 0]),
    it('フードデバイス（通常）', 'フードデバイス/法撃防御', [0, 0, 0, 0, 0, 0, 720]),

    // --- ディスク ---
    it('ディスク', 'カスタムディスク（テク/PA問わず）', [0, 0, 0, 150, -3, -3, -3]),
    it('ディスク', 'ディスク（通常）', [0, 0, 0, 30, -3, -3, -3]),

    // --- 消費アイテム ---
    it('消費アイテム', 'モノメイト', [4, 0, 0, -8, 4, 0, 0]),
    it('消費アイテム', 'ディメイト', [0, 4, 0, -8, 0, 4, 0]),
    it('消費アイテム', 'トリメイト / シフタライド / デバンライド', [0, 0, 4, -8, 0, 0, 4]),
    it('消費アイテム', 'ソルアトマイザー', [-2, -2, -2, 4, 0, 0, 0]),
    it('消費アイテム', 'スターアトマイザー', [4, 4, 4, -10, 0, 0, 0]),
    it('消費アイテム', 'ムーンアトマイザー / コスモアトマイザー', [0, 0, 0, -10, 4, 4, 4]),

    // --- ルームグッズ ---
    it('ルームグッズ', 'ルームグッズ★4（打撃用）', [5, 0, 0, -10, -10, 0, 0]),
    it('ルームグッズ', 'ルームグッズ★5（射撃用）', [0, 5, 0, -10, 0, -10, 0]),
    it('ルームグッズ', 'ルームグッズ★6（法撃用）', [0, 0, 5, -10, 0, 0, -10]),
    it('ルームグッズ', 'ルームグッズ★2（射撃/射防用）', [0, -10, 0, -10, 0, 5, 0]),
    it('ルームグッズ', 'ルームグッズ★3（法撃/法防用）', [0, 0, -10, -10, 0, 0, 5]),

    // --- ダウンデバイス ---
    it('ダウンデバイス', 'ダウンデバイス/打撃', [-240, 0, 0, 0, 0, 0, 0]),
    it('ダウンデバイス', 'ダウンデバイス/射撃', [0, -240, 0, 0, 0, 0, 0]),
    it('ダウンデバイス', 'ダウンデバイス/法撃', [0, 0, -240, 0, 0, 0, 0]),
    it('ダウンデバイス', 'ダウンデバイス/技量', [0, 0, 0, -240, 0, 0, 0])
  ];

  // --- 武器（餌）を生成 ---
  var WEAPON_RARITY = [
    { r: 9, main: 128, dex: 10, def: 30 },
    { r: 8, main: 104, dex: 9, def: 27 },
    { r: 7, main: 80, dex: 8, def: 24 },
    { r: 6, main: 63, dex: 7, def: 21 }
  ];
  [
    { name: '打撃', mainIdx: 0, defIdx: 4 },
    { name: '射撃', mainIdx: 1, defIdx: 5 },
    { name: '法撃', mainIdx: 2, defIdx: 6 }
  ].forEach(function (t) {
    WEAPON_RARITY.forEach(function (w) {
      var d = [0, 0, 0, w.dex, 0, 0, 0];
      d[t.mainIdx] = w.main;
      d[t.defIdx] = -w.def;
      ITEMS.push(it('武器（餌）', '★' + w.r + t.name + '武器', d));
    });
  });

  return {
    MAX_LEVEL: MAX_LEVEL,
    MAX_POINTS: MAX_POINTS,
    STATS: STATS,
    ITEMS: ITEMS,
    cumPoints: cumPoints,
    levelFromPoints: levelFromPoints,
    createState: createState,
    cloneState: cloneState,
    totalLevel: totalLevel,
    feed: feed,
    simulateToLevel: simulateToLevel
  };
});
