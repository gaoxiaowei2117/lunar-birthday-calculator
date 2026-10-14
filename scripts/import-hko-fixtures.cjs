'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
if (!root) throw new Error('请提供已下载的 HKO 表所在目录。');
const fixtures=[]; const counts={};
const years = [1901,1988,2000,2007,2023,2024,2026,2033,2034,2045,2057,2064,2083,2089,2097,2100];
for (const yearToRead of years) {
 const file = `${yearToRead}.txt`;
 if (!fs.existsSync(path.join(root,file))) throw new Error(`缺少 ${file}`);
 const year=Number(file.slice(0,4)); let month=null,leap=false,previousMonth=null;
 const raw=fs.readFileSync(path.join(root,file)).toString('latin1');
 for (const line of raw.split(/\r?\n/)) {
  const match=line.match(/^(\d{4})\/(\d+)\/(\d+)\s+(.+?)\s{2,}/); if (!match) continue;
  const [_,y,m,d,lunar]=match;
  const marker=lunar.match(/^(\d+)(?:st|nd|rd|th) Lunar Month$/i);
  let day;
  if(marker){ month=Number(marker[1]);leap=month===previousMonth;previousMonth=month;day=1; }
  else { day=Number(lunar); }
  if(month===null)continue;
  if(!Number.isInteger(day)||day<1||day>30)throw Error(line);
  const date=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  const lunarYear=Number(m)<=2 && month>=11 ? year-1 : year;
  const fixture={date,year:lunarYear,month,day,isLeap:leap};fixtures.push(fixture);
  counts[year]=(counts[year]||0)+1;

 }
}
if (fixtures.length !== 5628) throw new Error(`样本数异常：${fixtures.length}，请检查表格式。`);
const target = path.resolve(__dirname, '../tests/fixtures/hko-samples.json');
fs.writeFileSync(target,JSON.stringify({retrieved:process.argv[3] || new Date().toISOString().slice(0,10),sources:Object.keys(counts).map(y=>`https://www.hko.gov.hk/en/gts/time/calendar/text/files/T${y}e.txt`),notes:'从各年首个明确月首开始取样；重复出现的同号月首识别为闰月；未使用 Intl 生成期望值。',dates:fixtures},null,2)+'\n');
console.log(`已导入 ${fixtures.length} 个日期；请检查来源更新时间与文件差异。`);
