(function () {
  'use strict';
  const calendar = window.LunarCalendar;
  const byId = id => document.getElementById(id);
  let result = null;
  let busy = false;
  const fields = ['birth-date', 'max-age'];

  function visibleRows() {
    return result ? result.rows.filter(row => !byId('matches-only').checked || row.status === '同一天') : [];
  }

  function renderTable() {
    const rows = visibleRows();
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const tr = document.createElement('tr');
      if (row.match) tr.className = 'matched';
      const values = [`${row.age} 岁 / ${row.year}`, row.solarBirthday || '本年无此日期',
        calendar.formatLunar(row.solarLunar), row.status];
      for (const value of values) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      }
      fragment.append(tr);
    }
    byId('table-body').replaceChildren(fragment);
    byId('row-count').textContent = `${rows.length} 条记录`;
    byId('empty').hidden = rows.length !== 0;
    byId('export-csv').disabled = !result || busy || rows.length === 0;
  }

  function render() {
    const matches = result.rows.filter(row => row.match);
    const nonMatches = result.rows.filter(row => row.status === '不是同一天');
    byId('birth-lunar').textContent = calendar.formatLunar(result.birthLunar, true);
    byId('birth-solar').textContent = `阳历 ${result.birthDate}`;
    byId('match-count').textContent = `${matches.length} 个年份`;
    byId('non-match-count').textContent = `${nonMatches.length} 个年份`;
    byId('span-label').textContent = `每隔 19 年 · 共检查 ${result.rows.length} 次`;
    byId('truncated').hidden = !result.truncated;
    byId('truncated').textContent = `请求计算到 ${result.maxAge} 岁，日期范围限至 ${calendar.MAX_YEAR} 年；之后的 19 年检查点未计算。`;
    byId('unverified-range').hidden = Number(result.birthDate.slice(0, 4)) <= 2100 && !result.rows.some(row => row.year > 2100);
    for (const [id, rows] of [['match-years', matches], ['non-match-years', nonMatches]]) {
      const chips = rows.map(row => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = `${row.year} · ${row.age} 岁`;
        return chip;
      });
      byId(id).replaceChildren(...chips);
      if (!chips.length) byId(id).textContent = '检查范围内没有';
    }
    byId('results').hidden = false;
    renderTable();
  }

  function invalidate() {
    result = null;
    byId('progress').textContent = '';
    byId('results').hidden = true;
    byId('export-csv').disabled = true;
    byId('error').hidden = true;
  }

  const support = calendar.checkSupport();
  byId('engine-status').textContent = support.message;
  byId('calculate').disabled = !support.ok;
  if (!support.ok) {
    byId('error').textContent = support.message;
    byId('error').hidden = false;
  }
  fields.forEach(id => byId(id).addEventListener('input', invalidate));
  byId('matches-only').addEventListener('change', renderTable);
  byId('birthday-form').addEventListener('submit', event => {
    event.preventDefault();
    if (busy || !support.ok) return;
    invalidate();
    busy = true;
    fields.forEach(id => { byId(id).disabled = true; });
    byId('calculate').disabled = true;
    try {
      result = calendar.analyzeEvery19Years(byId('birth-date').value, Number(byId('max-age').value));
      busy = false;
      render();
      byId('progress').textContent = `计算完成，已检查 ${result.rows.length} 个 19 年间隔的年份。`;
    } catch (error) {
      invalidate();
      byId('error').textContent = error.message;
      byId('error').hidden = false;
      byId('progress').textContent = '';
    } finally {
      busy = false;
      fields.forEach(id => { byId(id).disabled = false; });
      byId('calculate').disabled = false;
    }
  });
  byId('export-csv').addEventListener('click', () => {
    if (!result || busy) return;
    const blob = new Blob([window.BirthdayCSV.toCSV(result, visibleRows(), calendar.formatLunar)], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `birthday-${result.birthDate}${byId('matches-only').checked ? '-matches' : ''}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
