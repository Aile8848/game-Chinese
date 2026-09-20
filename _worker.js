export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 只在 game-chinese.pages.dev 这个域名下拦截所有路径
    if (url.hostname === "game-chinese.pages.dev") {
      return new Response("404 Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
      });
    }

    // 其他域名正常放行
    return env.ASSETS.fetch(request);
  },
};