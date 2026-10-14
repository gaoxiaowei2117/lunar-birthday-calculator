'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('源码页面所有运行资源都在工程内，不依赖在线加载', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1].split("?")[0]);
  for (const ref of refs) {
    assert.ok(!/^(?:https?:|\/\/|\/)/.test(ref), ref);
    assert.ok(fs.existsSync(path.join(root, ref)), ref);
  }
  assert.doesNotMatch(html, /type="module"/);
  for (const file of ['calendar.js','csv.js','app.js','styles.css']) {
    const source = fs.readFileSync(path.join(root, 'src', file), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|@import|url\(/);
  }
});

test('构建产物完整内嵌脚本、样式和文档，无运行时外部资源', () => {
  const build = spawnSync(process.execPath, ['scripts/build.cjs'], {cwd:root, encoding:'utf8'});
  assert.equal(build.status, 0, build.stderr);
  const html = fs.readFileSync(path.join(root, 'dist/lunar_birthday_calculator.html'), 'utf8');
  assert.doesNotMatch(html, /<script[^>]*\bsrc=|<link[^>]*rel="stylesheet"/i);
  assert.doesNotMatch(html, /href="(?:README\.md|docs\/accuracy\.md)"/);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 3);
  scripts.forEach((match, i) => assert.doesNotThrow(() => new vm.Script(match[1], {filename:`bundled-${i}.js`})));
  assert.match(html, /id="bundled-accuracy"/);
  assert.match(html, /2057-09-28/);
});
