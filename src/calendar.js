/* Classic script intentionally supports file://. CommonJS export enables Node tests. */
(function (root) {
  'use strict';
  const MIN_YEAR = 1900;
  const MAX_YEAR = 2200;
  const MAX_AGE = 120;
  const DAY = 86400000;
  const cache = new Map();
  let formatter;

  function dateFromParts(year, month, day) {
    const value = new Date(Date.UTC(year, month - 1, day, 4));
    return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 &&
      value.getUTCDate() === day ? value : null;
  }

  function parseDate(text) {
    if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new RangeError('请输入 YYYY-MM-DD 格式的有效日期。');
    }
    const [year, month, day] = text.split('-').map(Number);
    const value = dateFromParts(year, month, day);
    if (!value || year < MIN_YEAR || year > MAX_YEAR) {
      throw new RangeError(`日期必须有效，且位于 ${MIN_YEAR}-01-01 至 ${MAX_YEAR}-12-31。`);
    }
    return value;
  }

  function isoDate(value) {
    return value.toISOString().slice(0, 10);
  }

  function getFormatter() {
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-u-ca-chinese', {
        calendar: 'chinese', numberingSystem: 'latn',
        year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Shanghai'
      });
      if (formatter.resolvedOptions().calendar !== 'chinese') {
        throw new Error('此浏览器不支持中国农历，请更换支持该历法的浏览器。');
      }
    }
    return formatter;
  }

  function solarToLunar(text) {
    const value = parseDate(text);
    const parts = Object.fromEntries(getFormatter().formatToParts(value).map(p => [p.type, p.value]));
    const match = /^(\d{1,2})(bis)?$/.exec(parts.month || '');
    const year = Number(parts.relatedYear);
    const day = Number(parts.day);
    if (!match || !Number.isInteger(year) || !Number.isInteger(day) || day < 1 || day > 30 ||
      Number(match[1]) < 1 || Number(match[1]) > 12) {
      throw new Error('无法识别此浏览器的农历输出，已停止计算。');
    }
    return {year, month: Number(match[1]), day, isLeap: Boolean(match[2])};
  }

  function lunarKey(lunar) {
    return `${lunar.month}/${lunar.day}/${lunar.isLeap ? 1 : 0}`;
  }

  function formatLunar(lunar, includeYear = false) {
    if (!lunar) return '—';
    const months = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '腊'];
    const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    let day;
    if (lunar.day <= 10) day = '初' + digits[lunar.day - 1];
    else if (lunar.day < 20) day = '十' + digits[lunar.day - 11];
    else if (lunar.day === 20) day = '二十';
    else if (lunar.day < 30) day = '廿' + digits[lunar.day - 21];
    else day = '三十';
    return `${includeYear ? lunar.year + '年 ' : ''}${lunar.isLeap ? '闰' : ''}${months[lunar.month - 1]}月${day}`;
  }

  // Index every civil day; keep all candidates when a lunar birthday appears twice in a Gregorian year.
  function yearIndex(year) {
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) throw new RangeError('年份超出范围。');
    if (cache.has(year)) return cache.get(year);
    const index = new Map();
    const end = dateFromParts(year + 1, 1, 1).getTime();
    for (let time = dateFromParts(year, 1, 1).getTime(); time < end; time += DAY) {
      const text = isoDate(new Date(time));
      const key = lunarKey(solarToLunar(text));
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(text);
    }
    cache.set(year, index);
    return index;
  }

  function findLunarBirthdays(year, lunar) {
    return [...(yearIndex(year).get(lunarKey(lunar)) || [])];
  }

  function setup(birthText, maxAge) {
    const birth = parseDate(birthText);
    if (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > MAX_AGE) throw new RangeError(`最大年龄必须是 0～${MAX_AGE} 的整数。`);
    const birthYear = birth.getUTCFullYear();
    return {birth, birthText, birthYear, birthLunar: solarToLunar(birthText), maxAge,
      lastYear: Math.min(birthYear + maxAge, MAX_YEAR), truncated: birthYear + maxAge > MAX_YEAR, rows: []};
  }

  function rowFor(state, year) {
    const solar = dateFromParts(year, state.birth.getUTCMonth() + 1, state.birth.getUTCDate());
    const solarBirthday = solar ? isoDate(solar) : null;
    const lunarBirthdays = findLunarBirthdays(year, state.birthLunar);
    const differences = lunarBirthdays.map(text => solar ? (parseDate(text) - solar) / DAY : null);
    const notes = [];
    if (!solar) notes.push('本年无 2 月 29 日');
    if (!lunarBirthdays.length) notes.push(state.birthLunar.isLeap ? '本年无此闰月生日' : '本年无此农历日期');
    if (lunarBirthdays.length > 1) notes.push('本公历年有两个对应日期');
    if ([2057, 2089, 2097].includes(year)) notes.push('远期朔日需复核');
    if (year === 1900) notes.push('未对照天文台表验证');
    if (year > 2100) notes.push('2101～2200 年未做权威对照验证');
    return {year, age: year - state.birthYear, solarBirthday,
      solarLunar: solarBirthday ? solarToLunar(solarBirthday) : null,
      lunarBirthdays, differences, match: Boolean(solarBirthday && lunarBirthdays.includes(solarBirthday)), notes};
  }

  function finish(state) {
    return {birthDate: state.birthText, birthLunar: state.birthLunar, maxAge: state.maxAge,
      lastYear: state.lastYear, truncated: state.truncated, rows: state.rows};
  }

  function analyze(birthText, maxAge = 100) {
    const state = setup(birthText, maxAge);
    for (let year = state.birthYear; year <= state.lastYear; year++) state.rows.push(rowFor(state, year));
    return finish(state);
  }

  async function analyzeAsync(birthText, maxAge = 100, onProgress = () => {}) {
    const state = setup(birthText, maxAge);
    const total = state.lastYear - state.birthYear + 1;
    for (let year = state.birthYear; year <= state.lastYear; year++) {
      state.rows.push(rowFor(state, year));
      onProgress(state.rows.length, total);
      if (state.rows.length % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return finish(state);
  }


  // Only inspect each nineteenth anniversary; convert its actual date independently.
  function analyzeEvery19Years(birthText, maxAge = 120) {
    const state = setup(birthText, maxAge);
    for (let age = 19; age <= maxAge; age += 19) {
      const year = state.birthYear + age;
      if (year > MAX_YEAR) break;
      const solar = dateFromParts(year, state.birth.getUTCMonth() + 1, state.birth.getUTCDate());
      const solarBirthday = solar ? isoDate(solar) : null;
      const solarLunar = solarBirthday ? solarToLunar(solarBirthday) : null;
      const match = Boolean(solarLunar && lunarKey(solarLunar) === lunarKey(state.birthLunar));
      const notes = [];
      if (!solar) notes.push('本年无 2 月 29 日，不自动改为其他日期');
      if ([2057, 2089, 2097].includes(year)) notes.push('远期朔日需复核');
      if (state.birthYear === 1900) notes.push('出生日期未对照天文台表验证');
      if (year > 2100) notes.push('2101～2200 年未做权威对照验证');
      if (solarBirthday === '2102-09-18' && solarLunar.month === 8 && solarLunar.day === 7 && !solarLunar.isLeap) {
        notes.push('此日期已通过浏览器与寿星天文历交叉核对');
      }
      state.rows.push({year, age, solarBirthday, solarLunar, match,
        status: !solar ? '无法比较' : match ? '同一天' : '不是同一天', notes});
    }
    return {...finish(state), interval: 19};
  }

  function checkSupport() {
    // Small independently sourced sentinel set; passing does not certify the full range.
    const samples = [
      ['1988-09-18', 1988, 8, 8, false], ['2023-03-22', 2023, 2, 1, true],
      ['2024-02-10', 2024, 1, 1, false], ['2033-12-22', 2033, 11, 1, true],
      ['2064-09-18', 2064, 8, 8, false], ['2083-09-18', 2083, 8, 7, false],
      ['2100-02-09', 2100, 1, 1, false]
    ];
    try {
      for (const [date, year, month, day, isLeap] of samples) {
        const actual = solarToLunar(date);
        if (actual.year !== year || actual.month !== month || actual.day !== day || actual.isLeap !== isLeap) {
          return {ok: false, message: `浏览器在参考日期 ${date} 的结果不同，已停止计算。请查阅验证报告或更换浏览器。`};
        }
      }
      return {ok: true, message: '浏览器通过 7 个参考日期检查；不代表全范围准确。'};
    } catch (error) { return {ok: false, message: error.message}; }
  }

  const api = {MIN_YEAR, MAX_YEAR, MAX_AGE, parseDate, isoDate, solarToLunar, formatLunar, findLunarBirthdays,
    analyze, analyzeAsync, analyzeEvery19Years, checkSupport};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LunarCalendar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
