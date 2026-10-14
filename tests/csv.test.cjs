'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const calendar = require('../src/calendar.js');
const csv = require('../src/csv.js');

test('CSV 带 BOM、CRLF、日期与闰月说明，并按当前筛选导出', () => {
  const result = calendar.analyzeEvery19Years('1988-09-18', 120);
  const rows = result.rows.filter(row => row.match);
  const output = csv.toCSV(result, rows, calendar.formatLunar);
  assert.equal(output.charCodeAt(0), 0xfeff);
  assert.equal(output.split('\r\n').length, rows.length + 2);
  assert.match(output, /"2064-09-18"/);
  assert.doesNotMatch(output, /"2083-09-19"/);
  assert.match(output, /部分远期日期需复核/);
});

test('CSV 正确转义引号、逗号、换行并防止公式注入', () => {
  assert.equal(csv.escapeCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csv.escapeCell('=1+1'), '"\'=1+1"');
  assert.equal(csv.escapeCell(null), '""');
});


test('新增范围导出保留检查点未验证说明', () => {
  const result = calendar.analyzeEvery19Years('2082-01-01', 19);
  const output = csv.toCSV(result, result.rows, calendar.formatLunar);
  assert.match(output, /2101-01-01/);
  assert.match(output, /2101～2200 年未做权威对照验证/);
});


test('CSV 同时显示是与不是，且不包含逐年日期或天数差', () => {
  const result = calendar.analyzeEvery19Years('1988-09-18', 120);
  const output = csv.toCSV(result, result.rows, calendar.formatLunar);
  assert.equal(output.split('\r\n').length, 8);
  assert.match(output, /"2083-09-18"/);
  assert.match(output, /"不是同一天"/);
  assert.match(output, /"同一天"/);
  assert.doesNotMatch(output, /相差天数|1989-09-18|"1988-09-18","1988年 八月初八","0"/);
});
