(function (root) {
  'use strict';
  function escapeCell(value) {
    // Quoting doubles embedded quotes; prefix potential spreadsheet formulas.
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function toCSV(result, rows, formatLunar) {
    const records = [['出生日期', '出生农历', '年龄（年份差）', '公历年份', '阳历生日', '阳历生日对应农历', '是否同一天', '说明', '计算口径']];
    for (const row of rows) {
      records.push([result.birthDate, formatLunar(result.birthLunar, true), row.age, row.year,
        row.solarBirthday || '', formatLunar(row.solarLunar, true), row.status,
        row.notes.join('；'), '每隔19年逐次核对；浏览器中国农历；UTC+8；严格区分闰月；部分远期日期需复核；2101～2200 年未做权威对照验证']);
    }
    return '\uFEFF' + records.map(record => record.map(escapeCell).join(',')).join('\r\n') + '\r\n';
  }
  const api = {escapeCell, toCSV};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BirthdayCSV = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
