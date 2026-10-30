/*
 * index.html + mag-core.js を1ファイルにまとめて
 * pso2-mag-calc-standalone.html を生成する。
 * 使い方: node build.js
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(dir, 'mag-core.js'), 'utf8');

const tag = '<script src="mag-core.js"></script>';
if (!html.includes(tag)) {
  throw new Error('index.html に ' + tag + ' が見つかりません');
}

html = html.replace(tag, '<script>\n' + core + '\n</script>');
fs.writeFileSync(path.join(dir, 'pso2-mag-calc-standalone.html'), html, 'utf8');
fs.writeFileSync(path.join(dir, 'mag-calc.html'), html, 'utf8');
console.log('built: pso2-mag-calc-standalone.html, mag-calc.html');
