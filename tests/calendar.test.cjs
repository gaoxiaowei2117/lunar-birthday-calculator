'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const calendar = require('../src/calendar.js');
const samples = require('./fixtures/hko-samples.json');

test('独立 HKO 日期对照：已知 2057 差异明确纳入检查，其余样本必须一致', t => {
  let knownDifferences = 0;
  assert.equal(samples.dates.length, 5628);
  for (const sample of samples.dates) {
    const {date, ...expected} = sample;
    const actual = calendar.solarToLunar(date);
    if (date >= '2057-09-28' && date <= '2057-10-27') {
      // Current ICU differs here; future engines may agree with HKO. Any third result fails.
      const alternative = date === '2057-09-28'
        ? {year:2057, month:8, day:30, isLeap:false}
        : {year:2057, month:9, day:expected.day - 1, isLeap:false};
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        assert.deepEqual(actual, alternative, date);
        knownDifferences++;
      }
    } else assert.deepEqual(actual, expected, date);
  }
  t.diagnostic(`Node ${process.version}, ICU ${process.versions.icu}: ${samples.dates.length} 日期，已知差异 ${knownDifferences}；其他日期一致。`);
});

test('输入、世纪闰年与日期边界', () => {
  for (const date of ['1899-12-31','2201-01-01','1900-02-29','2100-02-29','2200-02-29','2023-02-29','2024-04-31','2024-13-01','1988-9-18','not-a-date']) {
    assert.throws(() => calendar.parseDate(date), RangeError, date);
  }
  for (const date of ['1900-01-01','2000-02-29','2100-12-31','2101-01-01','2200-12-31']) {
    assert.equal(calendar.isoDate(calendar.parseDate(date)), date);
    assert.ok(calendar.solarToLunar(date).month >= 1);
  }
  for (const age of [-1,121,1.5,NaN]) assert.throws(() => calendar.analyze('1988-09-18', age));
});

test('默认生日：十九年间隔并非永远重合', () => {
  const result = calendar.analyze('1988-09-18', 100);
  assert.equal(result.rows.length, 101);
  assert.deepEqual(result.birthLunar, {year:1988,month:8,day:8,isLeap:false});
  for (const year of [1988,2007,2026,2045,2064]) assert.equal(result.rows.find(row => row.year === year).match, true);
  const row = result.rows.find(row => row.year === 2083);
  assert.equal(row.match, false);
  assert.deepEqual(row.lunarBirthdays, ['2083-09-19']);
  assert.deepEqual(row.differences, [1]);
});

test('2 月 29 日保留不可比较行；三十不自动改成二十九', () => {
  const result = calendar.analyze('2000-02-29', 1);
  assert.equal(result.rows[1].solarBirthday, null);
  assert.equal(result.rows[1].match, false);
  assert.ok(result.rows[1].differences.every(d => d === null));
  const thirty = {month:1,day:30,isLeap:false};
  assert.equal(calendar.findLunarBirthdays(2023, thirty).length, 0);
});

test('闰月严格区分；2033 闰十一月；同一公历年的两个候选全部保留', () => {
  assert.deepEqual(calendar.solarToLunar('2033-12-22'), {year:2033,month:11,day:1,isLeap:true});
  assert.deepEqual(calendar.findLunarBirthdays(2023, {month:2,day:1,isLeap:true}), ['2023-03-22']);
  assert.deepEqual(calendar.findLunarBirthdays(2024, {month:2,day:1,isLeap:true}), []);
  assert.deepEqual(calendar.findLunarBirthdays(2023, {month:2,day:1,isLeap:false}), ['2023-02-20']);
  assert.deepEqual(calendar.findLunarBirthdays(2033, {month:12,day:1,isLeap:false}), ['2033-01-01']);
  const dates = calendar.findLunarBirthdays(2024, {month:12,day:1,isLeap:false});
  assert.deepEqual(dates, ['2024-01-11','2024-12-31']);
});

test('最大年龄零与 2200 截断；同步和异步结果一致', async () => {
  assert.equal(calendar.analyze('1988-09-18', 0).rows.length, 1);
  const truncated = calendar.analyze('2199-12-31', 100);
  assert.equal(truncated.truncated, true);
  assert.equal(truncated.lastYear, 2200);
  assert.equal(truncated.rows.length, 2);
  assert.equal(truncated.rows[1].solarBirthday, '2200-12-31');
  assert.deepEqual(await calendar.analyzeAsync('1988-09-18', 2), calendar.analyze('1988-09-18', 2));
});

test('温哥华、上海和 UTC 系统时区得出相同日期', () => {
  const expression = `const c=require('./src/calendar.js');console.log(JSON.stringify(c.analyze('2023-03-22',2)));`;
  const values = ['America/Vancouver','Asia/Shanghai','UTC'].map(TZ => {
    const child = spawnSync(process.execPath, ['-e', expression], {cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,TZ},encoding:'utf8'});
    assert.equal(child.status, 0, child.stderr);
    return child.stdout;
  });
  assert.equal(values[0], values[1]);
  assert.equal(values[1], values[2]);
});

test('浏览器能力哨兵通过，并清楚限定其含义', () => {
  assert.equal(calendar.checkSupport().ok, true);
  assert.match(calendar.checkSupport().message, /不代表全范围准确/);
});


test('允许计算到 120 岁，121 岁拒绝，1988 年出生可完整计算至 2108 年', async () => {
  const full = calendar.analyze('1901-09-18', 120);
  assert.equal(full.rows.length, 121);
  assert.equal(full.rows.at(-1).age, 120);
  assert.equal(full.lastYear, 2021);
  assert.equal(full.truncated, false);
  assert.equal(calendar.analyze('1901-09-18', 101).rows.length, 102);
  const limited = await calendar.analyzeAsync('1988-09-18', 120);
  assert.equal(limited.maxAge, 120);
  assert.equal(limited.lastYear, 2108);
  assert.equal(limited.rows.at(-1).age, 120);
  assert.equal(limited.rows.length, 121);
  assert.ok(limited.rows.filter(row => row.year > 2100).every(row => row.notes.some(note => note.includes("未做权威对照验证"))));
  assert.equal(limited.truncated, false);
  assert.throws(() => calendar.analyze('1901-09-18', 121), /0～120/);
  await assert.rejects(calendar.analyzeAsync('1901-09-18', 121), /0～120/);
});


test('2200 年末出生可计算，2200 世纪平年的二月生日缺失得到保留', () => {
  const end = calendar.analyze('2200-12-31', 120);
  assert.equal(end.rows.length, 1);
  assert.equal(end.lastYear, 2200);
  assert.equal(end.truncated, true);
  assert.equal(end.rows[0].match, true);
  assert.ok(end.rows[0].notes.some(note => note.includes('未做权威对照验证')));
  const leap = calendar.analyze('2196-02-29', 4);
  assert.equal(leap.rows.at(-1).year, 2200);
  assert.equal(leap.rows.at(-1).solarBirthday, null);
  assert.equal(leap.rows.at(-1).match, false);
});
