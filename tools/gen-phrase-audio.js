#!/usr/bin/env node
/**
 * 通关语音生成脚本
 * 生成 audio/words/ 下的固定短句 mp3
 * 用法：node tools/gen-phrase-audio.js
 */
'use strict';
const fs = require('fs'), path = require('path');

const CONFIG = {
  WORKER_URL: 'https://tts.leci04.top',
  VOICE: 'zh-CN-XiaoxiaoNeural',
  SPEED: 0.9, PITCH: '0', STYLE: 'general',
  OUT_DIR: 'audio/words'
};

/* ★ 与 index.html 中的文案保持一致 */
const PHRASES = [
  '全部完成真棒',
  '太厉害了全部答对'
];

async function fetchAudio(text){
  const url = CONFIG.WORKER_URL.replace(/\/+$/,'') + '/v1/audio/speech';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try{
    const res = await fetch(url, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({input:text, voice:CONFIG.VOICE, speed:CONFIG.SPEED, pitch:CONFIG.PITCH, style:CONFIG.STYLE}),
      signal: ctrl.signal
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if(buf.length < 300) throw new Error('数据过小');
    return buf;
  }finally{ clearTimeout(t); }
}

(async () => {
  const dir = path.resolve(process.cwd(), CONFIG.OUT_DIR);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for(const p of PHRASES){
    const fp = path.join(dir, p + '.mp3');
    try{
      const buf = await fetchAudio(p);
      fs.writeFileSync(fp, buf);
      console.log('  ✓ ' + p + '.mp3（' + buf.length + ' 字节）');
    }catch(e){
      console.log('  ✗ ' + p + '：' + e.message);
    }
  }
  console.log('\n完成，输出目录：' + CONFIG.OUT_DIR);
})();