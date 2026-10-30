/*
 * ローカル確認用の簡易HTTPサーバー
 * 使い方: node serve.js
 * 表示されたURLをブラウザで開く。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const ports = [8787, 8788, 8789, 8790, 8791];
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png'
};

function handler(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/mag-calc.html';
  const file = path.join(root, urlPath);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

function tryListen(i) {
  if (i >= ports.length) {
    console.error('空きポートが見つかりませんでした');
    process.exit(1);
  }
  const server = http.createServer(handler);
  server.on('error', function () {
    tryListen(i + 1);
  });
  server.listen(ports[i], '127.0.0.1', function () {
    console.log('READY http://localhost:' + ports[i] + '/');
  });
}

tryListen(0);
