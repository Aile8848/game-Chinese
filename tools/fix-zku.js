#!/usr/bin/env node
/**
 * zku-data.js 修正补丁脚本
 * ------------------------------------------------------------------
 * 用途：修正字库中的繁体字、错别字、拼音错误、乱码组词
 * 用法：node tools/fix-zku.js
 * 输出：原地修正 zku-data.js（自动备份为 zku-data.backup.js）
 * ------------------------------------------------------------------
 */

'use strict';
const fs   = require('fs');
const path = require('path');

/* ============ ① 修正清单 ============ */
/* 格式：[年级, 汉字, 字段, 预期原值, 修正值]
 *   字段：'p' = 拼音, 'w' = 组词
 * 只在该字当前值 === 预期原值时替换，避免误伤 */
const FIXES = [
  /* ---------- 繁体字 ---------- */
  ['3', '假', 'w', '假裝', '假装'],
  ['3', '术', 'w', '造紙术', '造纸术'],
  ['3', '骄', 'w', '骄驕', '骄傲'],
  ['3', '谦', 'w', '谦虛', '谦虚'],

  /* ---------- 错别字 ---------- */
  ['3', '衬', 'w', '村衫', '衬衫'],
  ['3', '衫', 'w', '村衫', '衬衫'],
  ['4', '坑', 'w', '坑坑注洼', '坑坑洼洼'],
  ['4', '洼', 'w', '坑坑注洼', '坑坑洼洼'],
  ['5', '纠', 'w', '纠正不可', '纠正'],
  ['6', '莹', 'w', '品莹', '晶莹'],
  ['6', '控', 'w', '控劇', '控制'],

  /* ---------- 拼音错误 ---------- */
  ['6', '脆', 'p', 'cuè', 'cuì'],

  /* ---------- 乱拼/共用错误组词（拆分后各配一词）---------- */
  ['6', '基', 'w', '基地目睹', '基地'],
  ['6', '睹', 'w', '基地目睹', '目睹'],
  ['6', '沮', 'w', '沮丧抽屉', '沮丧'],
  ['6', '丧', 'w', '沮丧抽屉', '丧失'],
  ['6', '屉', 'w', '沮丧抽屉', '抽屉'],
  ['6', '倾', 'w', '倾覆宽慰', '倾覆'],
  ['6', '覆', 'w', '倾覆宽慰', '覆盖'],
  ['6', '恰', 'w', '骆驼恰好', '恰好'],
  ['6', '骆', 'w', '骆驼恰好', '骆驼'],
  ['5', '特', 'w', '南方特别', '特别'],

  /* ---------- 地狱难度（只修拼音/错字）---------- */
  ['hell', '琢', 'p', 'zuó', 'zhuó'],
  ['hell', '琢', 'w', '琢玉', '琢磨'],
  ['hell', '掺', 'p', 'càn', 'chān'],
  ['hell', '肋', 'p', 'lē', 'lèi'],
  ['hell', '肋', 'w', '肋间', '肋骨'],
  ['hell', '伺', 'p', 'cì', 'sì'],
  ['hell', '伺', 'w', '伺候', '伺机'],
  ['hell', '辗', 'p', 'niǎn', 'zhǎn'],
  ['hell', '辗', 'w', '辗铁', '辗转']
];

/* ============ ② 读取 & 解析 ============ */
const ROOT = process.cwd();
const ZKU_PATH = path.join(ROOT, 'zku-data.js');
const BACKUP_PATH = path.join(ROOT, 'zku-data.backup.js');

if(!fs.existsSync(ZKU_PATH)){
  console.error('✗ 找不到 zku-data.js，请在项目根目录运行本脚本');
  process.exit(1);
}

let code = fs.readFileSync(ZKU_PATH, 'utf8');

/* 通过 new Function 解析出 ZKU 对象 */
let ZKU;
try{
  ZKU = new Function('window','globalThis', code + '\n;return ZKU;')({}, {});
}catch(e){
  console.error('✗ 解析 zku-data.js 失败：' + e.message);
  process.exit(1);
}
if(!ZKU || typeof ZKU !== 'object'){
  console.error('✗ 未找到 ZKU 对象');
  process.exit(1);
}

/* ============ ③ 应用修正 ============ */
const applied = [];   /* 已应用 */
const missed  = [];   /* 未命中（原值不符或字不存在）*/

for(const [grade, ch, field, expect, fix] of FIXES){
  const list = ZKU[grade];
  if(!Array.isArray(list)){ missed.push([grade, ch, field, expect, '年级不存在']); continue; }
  const row = list.find(r => r && r[0] === ch);
  if(!row){ missed.push([grade, ch, field, expect, '未找到该字']); continue; }

  const idx = field === 'p' ? 1 : 2;
  if(row[idx] !== expect){
    /* 原值不符：可能已经改过，或数据和我预期不同 → 记录，尝试直接替换 */
    if(row[idx] === fix){
      /* 已经是修正后的值，视为已处理 */
      continue;
    }
    missed.push([grade, ch, field, expect, '当前值="' + row[idx] + '" 不符']);
    continue;
  }
  row[idx] = fix;
  applied.push([grade, ch, field, expect, fix]);
}

/* ============ ④ 生成新文件内容 ============ */
/* 用 JSON 序列化并格式化，保持紧凑（一行一个年级，避免文件过大） */
function serialize(ZKU){
  const parts = [];
  for(const g of Object.keys(ZKU)){
    const rows = ZKU[g].map(r => JSON.stringify(r)).join(',');
    parts.push(JSON.stringify(g) + ':[' + rows + ']');
  }
  return 'const ZKU={\n' + parts.join(',\n') + '\n};\n';
}

const newCode = serialize(ZKU);

/* ============ ⑤ 备份 & 写入 ============ */
fs.writeFileSync(BACKUP_PATH, code, 'utf8');
fs.writeFileSync(ZKU_PATH, newCode, 'utf8');

/* ============ ⑥ 报告 ============ */
console.log('');
console.log('🔧 zku-data.js 修正完成');
console.log('─'.repeat(56));
console.log('  备份：zku-data.backup.js');
console.log('  写入：zku-data.js');
console.log('');

if(applied.length){
  console.log('  ✅ 已修正 ' + applied.length + ' 处：');
  for(const [g, ch, f, from, to] of applied){
    console.log(`     [${g}年级] ${ch}  ${f === 'p' ? '拼音' : '组词'}  "${from}" → "${to}"`);
  }
}else{
  console.log('  ⚠ 没有应用任何修正（可能已修过？）');
}

if(missed.length){
  console.log('');
  console.log('  ⚠ ' + missed.length + ' 处未命中（请检查）：');
  for(const [g, ch, f, expect, why] of missed){
    console.log(`     [${g}年级] ${ch}  ${f === 'p' ? '拼音' : '组词'}  期望"${expect}" — ${why}`);
  }
}

console.log('');
console.log('下一步：node tools/gen-audio.js --dry  验证字库正常');
console.log('');