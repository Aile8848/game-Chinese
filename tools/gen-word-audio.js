#!/usr/bin/env node
/**
 * 组词音频批量生成脚本
 * ------------------------------------------------------------------
 * 读取 zku-data.js 所有组词（第 3 字段）→ 生成 audio/words/<组词>.mp3
 *
 * 用法：
 *   node tools/gen-word-audio.js --dry      # 试运行
 *   node tools/gen-word-audio.js            # 全量（跳过已存在）
 *   node tools/gen-word-audio.js --force    # 强制重生成
 * ------------------------------------------------------------------
 */

'use strict';
const fs   = require('fs');
const path = require('path');

/* ============ ① 配置（与 gen-audio.js 一致） ============ */
const CONFIG = {
  WORKER_URL: 'https://tts.leci04.top',
  GAME_KEY: '',              /* 官方版无需鉴权，留空 */
  KEY_HEADER: 'X-Game-Key',

  VOICE: 'zh-CN-XiaoxiaoNeural',
  SPEED: 0.9,
  PITCH: '0',
  STYLE: 'general',

  OUT_DIR: 'audio/words',    /* 组词单独目录 */
  ZKU_PATH: 'zku-data.js',

  CONCURRENCY: 4,
  TIMEOUT: 30000,            /* 组词更长，给 30s */
  RETRY: 3,
  RETRY_DELAY: 1200
};

/* ============ ② 命令行 ============ */
const ARGV = process.argv.slice(2);
const OPT = {
  force: ARGV.includes('--force'),
  dry:   ARGV.includes('--dry')
};

/* ============ ③ 着色 ============ */
const C = { r:'\x1b[0m', red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m',
            blue:'\x1b[34m', gray:'\x1b[90m', bold:'\x1b[1m' };
const log = (...a) => console.log(...a);
const ok   = m => log(C.green + '  ✓ ' + C.r + m);
const warn = m => log(C.yellow + '  ⚠ ' + C.r + m);
const err  = m => log(C.red + '  ✗ ' + C.r + m);
const info = m => log(C.blue + '  ℹ ' + C.r + m);
const dim  = m => log(C.gray + '    ' + m + C.r);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ============ ④ 解析字库 ============ */
function loadZKU(file){
  const code = fs.readFileSync(file, 'utf8');
  let ZKU;
  try{
    ZKU = new Function('window','globalThis', code + '\n;return ZKU;')({}, {});
  }catch(e){ throw new Error('解析 zku-data.js 失败：' + e.message); }
  if(!ZKU || typeof ZKU !== 'object') throw new Error('未找到 ZKU 对象');
  return ZKU;
}

/* 文件名安全校验：不含非法字符、长度合理 */
function isSafeName(w){
  if(!w) return false;
  if(w.length > 12) return false;
  if(/[\\/:*?"<>|\r\n\t]/.test(w)) return false;
  return true;
}

/* 收集所有组词（去重） */
function collectWords(ZKU){
  const map = new Map();      /* 组词 → Set(年级) */
  const skipped = [];
  for(const g of Object.keys(ZKU)){
    for(const row of (ZKU[g] || [])){
      if(!Array.isArray(row) || row.length < 3) continue;
      const w = String(row[2] || '').trim();
      if(!w) continue;
      if(!isSafeName(w)){ skipped.push({ w, grade: g }); continue; }
      if(!map.has(w)) map.set(w, new Set());
      map.get(w).add(g);
    }
  }
  return { map, skipped };
}

/* ============ ⑤ 调 Worker ============ */
async function fetchAudio(text){
  const url = CONFIG.WORKER_URL.replace(/\/+$/, '') + '/v1/audio/speech';
  const headers = { 'Content-Type': 'application/json' };
  if(CONFIG.GAME_KEY) headers[CONFIG.KEY_HEADER] = CONFIG.GAME_KEY;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT);
  try{
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: text,
        voice: CONFIG.VOICE,
        speed: CONFIG.SPEED,
        pitch: CONFIG.PITCH,
        style: CONFIG.STYLE
      }),
      signal: ctrl.signal
    });
    if(!res.ok){
      const t = await res.text().catch(() => '');
      throw new Error('HTTP ' + res.status + ' ' + t.slice(0, 120));
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if(buf.length < 300) throw new Error('返回数据过小（' + buf.length + ' 字节）');
    return buf;
  }finally{ clearTimeout(timer); }
}

async function generateWithRetry(w){
  let lastErr;
  for(let i = 1; i <= CONFIG.RETRY; i++){
    try{ return await fetchAudio(w); }
    catch(e){ lastErr = e; if(i < CONFIG.RETRY) await sleep(CONFIG.RETRY_DELAY * i); }
  }
  throw lastErr;
}

/* ============ ⑥ 并发池 ============ */
async function runPool(items, worker, concurrency){
  let idx = 0;
  const n = Math.min(concurrency, items.length);
  async function runner(){
    while(true){
      const my = idx++;
      if(my >= items.length) break;
      await worker(items[my]);
    }
  }
  await Promise.all(Array.from({ length: n }, runner));
}

/* ============ ⑦ 主流程 ============ */
async function main(){
  log('');
  log(C.bold + '🔊 组词音频批量生成' + C.r);
  log(C.gray + '─'.repeat(58) + C.r);

  const zkuPath = path.resolve(process.cwd(), CONFIG.ZKU_PATH);
  if(!fs.existsSync(zkuPath)){ err('找不到字库：' + zkuPath); process.exit(1); }
  info('字库：' + CONFIG.ZKU_PATH);

  let ZKU;
  try{ ZKU = loadZKU(zkuPath); }
  catch(e){ err(e.message); process.exit(1); }

  const { map, skipped } = collectWords(ZKU);
  const words = Array.from(map.keys()).sort();
  info('待生成：' + C.bold + words.length + C.r + ' 个组词');
  if(skipped.length){
    warn('跳过 ' + skipped.length + ' 个不适合做文件名的组词');
    skipped.slice(0, 8).forEach(s => dim(s.w + '（' + s.grade + '年级）'));
    if(skipped.length > 8) dim('…还有 ' + (skipped.length - 8) + ' 个');
  }

  const outDir = path.resolve(process.cwd(), CONFIG.OUT_DIR);
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  info('输出：' + CONFIG.OUT_DIR + '/');
  info('参数：' + CONFIG.VOICE + ' / 语速 ' + CONFIG.SPEED);

  if(OPT.dry){
    log('');
    warn('试运行（--dry）——不会实际请求');
    words.slice(0, 10).forEach(w => dim(w + '.mp3'));
    if(words.length > 10) dim('…');
    return;
  }

  /* 探测 Worker */
  log('');
  info('探测 Worker…');
  try{
    const probe = await fetchAudio('测试');
    ok('Worker 可用（返回 ' + probe.length + ' 字节）');
  }catch(e){
    err('Worker 不可用：' + e.message);
    process.exit(1);
  }

  /* 过滤已存在 */
  const todo = [];
  let skipN = 0;
  for(const w of words){
    const fp = path.join(outDir, w + '.mp3');
    if(!OPT.force && fs.existsSync(fp) && fs.statSync(fp).size > 300){ skipN++; continue; }
    todo.push(w);
  }
  if(skipN) info('跳过已存在：' + skipN + ' 个');
  info('本次生成：' + C.bold + todo.length + C.r + ' 个');
  if(!todo.length){ log(''); ok('全部已生成完毕'); return; }

  log('');
  log(C.bold + '开始生成…' + C.r);
  const t0 = Date.now();
  let okCount = 0, failCount = 0;
  const failed = [];

  await runPool(todo, async (w) => {
    const fp = path.join(outDir, w + '.mp3');
    try{
      const buf = await generateWithRetry(w);
      fs.writeFileSync(fp, buf);
      okCount++;
    }catch(e){
      failCount++;
      failed.push({ w, err: e.message });
    }
    const cur = okCount + failCount, total = todo.length;
    const barLen = 28;
    const fill = Math.round(barLen * cur / total);
    const bar = '█'.repeat(fill) + '░'.repeat(barLen - fill);
    process.stdout.write(`\r  [${bar}] ${(cur/total*100).toFixed(1)}%  ${cur}/${total}  ✓${okCount} ✗${failCount}   `);
  }, CONFIG.CONCURRENCY);

  process.stdout.write('\n');
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  log('');
  log(C.gray + '─'.repeat(58) + C.r);
  ok(`完成：成功 ${okCount}，失败 ${failCount}，用时 ${dur}s`);

  if(failed.length){
    warn('失败清单（重跑自动重试）：');
    failed.slice(0, 20).forEach(f => dim(f.w + '：' + f.err));
    if(failed.length > 20) dim('…还有 ' + (failed.length - 20) + ' 个');
  }

  /* 索引 */
  const index = {};
  for(const w of words){
    const fp = path.join(outDir, w + '.mp3');
    if(fs.existsSync(fp)) index[w] = { g: Array.from(map.get(w)).sort(), s: fs.statSync(fp).size };
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 0), 'utf8');
  let totalSize = 0;
  for(const k in index) totalSize += index[k].s;
  ok('索引：audio/words/index.json（' + Object.keys(index).length + ' 项）');
  info('组词音频总体积：' + (totalSize / 1024 / 1024).toFixed(2) + ' MB');
  log('');
}

main().catch(e => { err('脚本异常：' + e.message); console.error(e); process.exit(1); });