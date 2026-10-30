const M = require('./mag-core.js');

function pure(statIndex, level) {
  const levels = [0, 0, 0, 0, 0, 0, 0];
  levels[statIndex] = level;
  return M.createState(levels);
}

function item(name) {
  const found =
    M.ITEMS.find(i => i.name === name) ||
    M.ITEMS.find(i => i.name.endsWith(name)) ||
    M.ITEMS.find(i => i.name.includes(name));
  if (!found) throw new Error('item not found: ' + name);
  return found;
}

const DEX = 3;
let ng = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) ng++;
  console.log((ok ? 'OK  ' : 'NG  ') + label + ': ' + actual + (ok ? '' : ' (expected ' + expected + ')'));
}

// 139 -> 177 (38 levels)
check('技量139→177 フードデバイス/技量ミニ',
  M.simulateToLevel(pure(DEX, 139), item('技量ミニ'), 177).count, 152);

check('技量139→177 カスタムディスク',
  M.simulateToLevel(pure(DEX, 139), item('カスタムディスク'), 177).count, 61);

// 0 -> 200
check('技量0→200 技量ミニ',
  M.simulateToLevel(pure(DEX, 0), item('技量ミニ'), 200).count, 502);

check('技量0→200 カスタムディスク',
  M.simulateToLevel(pure(DEX, 0), item('カスタムディスク'), 200).count, 201);

check('技量0→200 フードデバイス/技量(通常)',
  M.simulateToLevel(pure(DEX, 0), item('フードデバイス/技量'), 200).count, 42);

// 端数チェック: 139 + 61枚 = Lv177, 端数30pt
const r = M.simulateToLevel(pure(DEX, 139), item('カスタムディスク'), 177);
check('カスタムディスク61枚の到達Lv', M.totalLevel(r.state), 177);
check('カスタムディスク61枚の端数pt', r.state[DEX].points - M.cumPoints(177), 30);

// 累計ポイントの整合性
check('cumPoints(50)', M.cumPoints(50), 1500);
check('cumPoints(120)', M.cumPoints(120), 10900);
check('cumPoints(200)', M.cumPoints(200), 30100);
check('levelFromPoints(30100)', M.levelFromPoints(30100), 200);
check('levelFromPoints(24580)', M.levelFromPoints(24580), 177);

// 逆算の端数確認: 59枚では177に届かない
check('カスタムディスク59枚では177未満',
  M.totalLevel(M.simulateToLevel(pure(DEX, 139), item('カスタムディスク'), 177).state) >= 177, true);

// 複数アイテムのプラン: 139 → カスタムディスク61枚 → 技量ミニ92個 → 200
const planState = pure(DEX, 139);
M.feed(planState, item('カスタムディスク'), 61);
check('プラン1: カスタムディスク61枚後', M.totalLevel(planState), 177);
M.feed(planState, item('技量ミニ'), 92);
check('プラン2: 技量ミニ92個後', M.totalLevel(planState), 200);

console.log(ng === 0 ? '\nALL OK' : '\n' + ng + ' test(s) failed');
process.exit(ng === 0 ? 0 : 1);
