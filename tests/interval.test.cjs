'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const calendar = require('../src/calendar.js');

test('只检查19年倍数，默认生日的已核对年份正确分类', () => {
  const result = calendar.analyzeEvery19Years('1988-09-18', 120);
  assert.deepEqual(result.rows.map(row => row.age), [19,38,57,76,95,114]);
  assert.deepEqual(result.rows.filter(row => row.match).map(row => row.year), [2007,2026,2045,2064]);
  assert.deepEqual(result.rows.filter(row => row.status === '不是同一天').map(row => row.year), [2083,2102]);
  assert.equal(result.rows.find(row => row.year === 2083).solarLunar.day, 7);
  assert.ok(result.rows.at(-1).notes.some(note => note.includes('未做权威对照验证')));
  assert.ok(result.rows.every(row => !('differences' in row)));
});

test('小于19岁无检查点，19岁包含端点，2200年后检查点明确截断', () => {
  assert.equal(calendar.analyzeEvery19Years('1988-09-18', 18).rows.length, 0);
  assert.equal(calendar.analyzeEvery19Years('1988-09-18', 19).rows.length, 1);
  const result = calendar.analyzeEvery19Years('2190-09-18', 120);
  assert.equal(result.rows.length, 0);
  assert.equal(result.truncated, true);
});

test('2月29日的缺失年份是无法比较，不被归入不是同一天', () => {
  const result = calendar.analyzeEvery19Years('2000-02-29', 76);
  assert.deepEqual(result.rows.map(row => row.status), ['无法比较','无法比较','无法比较', '同一天']);
  assert.equal(result.rows[0].solarBirthday, null);
});


test('2102具体日期的独立核对记录一致，不把单日核对推广到全年', () => {
  const evidence = require('./fixtures/2102-crosscheck.json');
  for (const row of evidence.dates) assert.deepEqual(calendar.solarToLunar(row.date), row.lunar);
  const verified = calendar.analyzeEvery19Years('1988-09-18', 120).rows.at(-1);
  assert.ok(verified.notes.some(note => note.includes('交叉核对')));
  const other = calendar.analyzeEvery19Years('1988-10-10', 120).rows.at(-1);
  assert.ok(!other.notes.some(note => note.includes('交叉核对')));
});
