'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="src/styles.css">', () => `<style>\n${read('src/styles.css')}\n</style>`);
html = html.replace(/<script defer src="src\/(?:calendar|csv|app)\.js(?:\?[^"<>]*)?"><\/script>/g, '');
const scripts = ['calendar.js', 'csv.js', 'app.js'].map(file =>
  `<script>\n${read('src/' + file).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
html = html.replace('</body>', () => `${scripts}\n</body>`);
html = html.replaceAll('href="docs/accuracy.md"', 'href="#bundled-accuracy"')
  .replaceAll('href="README.md"', 'href="#bundled-readme"');
const docs = `<details class="card" id="bundled-accuracy"><summary>日期范围与准确性报告</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(read('docs/accuracy.md'))}</pre></details>\n` +
  `<details class="card" id="bundled-readme"><summary>项目说明</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(read('README.md'))}</pre></details>`;
html = html.replace('</main>', () => `${docs}\n</main>`);
fs.mkdirSync(path.join(root, 'dist'), {recursive:true});
fs.writeFileSync(path.join(root, 'dist/lunar_birthday_calculator.html'), html);
console.log('已生成 dist/lunar_birthday_calculator.html（无外部资源，可单独离线打开）。');
