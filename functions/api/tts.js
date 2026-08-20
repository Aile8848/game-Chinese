/* Pages Function：前端 → Worker 的安全代理
 * 文件需放在仓库的 functions/api/tts.js（Cloudflare Pages 会自动挂载为 /api/tts）
 * 环境变量（Pages Dashboard → 对应项目的 Settings → Functions → Environment variables）：
 *   TTS_WORKER_URL : 上面那个 Worker 的地址，务必带 https:// 且不要以 / 结尾
 *                    例：https://your-tts-worker.your-subdomain.workers.dev
 *   TTS_API_KEY    : 必须与 Worker 的 API_KEY 环境变量「值相同」（两个变量名不同，但值要对上）
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Game-Key',
};

export async function onRequestPost({ request, env }) {
  try {
    if (!env.TTS_WORKER_URL || !env.TTS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Pages 未配置 TTS_WORKER_URL / TTS_API_KEY' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    // 规整 Worker 地址：补协议、去结尾斜杠，避免拼出 https://x//v1/... 这类错误 URL
    let base = env.TTS_WORKER_URL.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
    const workerUrl = base + '/v1/audio/speech';

    const body = await request.json();

    const workerResp = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Game-Key': env.TTS_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!workerResp.ok) {
      let msg = '上游 Worker 返回 ' + workerResp.status;
      try { const j = await workerResp.json(); if (j && j.error) msg = j.error; } catch (_) {}
      return new Response(JSON.stringify({ error: msg }), {
        status: workerResp.status, headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }

    const audioBlob = await workerResp.blob();
    return new Response(audioBlob, {
      status: 200,
      headers: {
        'Content-Type': workerResp.headers.get('Content-Type') || 'audio/mpeg',
        ...CORS
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }
}

/* 处理浏览器跨域预检（同域名调用一般走不到，但带上更稳） */
export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
