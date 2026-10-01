# 汉字拼音配对消消乐

<p align="center">
  <b>一个面向小学生的汉字拼音练习网页游戏</b><br>
  人教部编版 1—6 年级生字表 · 点字配音 · 配对消除
</p>

<p align="center">
  <a href="https://game.leci04.top/"><img src="https://img.shields.io/badge/在线体验-game.leci04.top-FF9E2C?style=for-the-badge" alt="在线体验"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge" alt="License: GPL v3"></a>
</p>

---

## 📖 项目简介

「汉字拼音配对消消乐」是一款**纯前端**的汉字拼音练习小游戏，把「汉字」和它的「拼音」做成卡片，让小朋友通过**配对消除**的方式记住生字读音。

- 🎯 **目标用户**：小学 1—6 年级学生
- 📚 **字库来源**：人教部编版小学语文写字表（1—6 年级）+ 地狱难度常用字
- 🔊 **朗读方式**：全部使用**预生成音频包**，无需联网语音引擎，各设备兼容性高
- 💾 **零后端**：纯静态，托管在 Cloudflare Pages

> ⚠️ **免责声明**：本项目的字库数据基于人教部编版小学语文教材整理，**仅供学习交流使用**，不得用于商业出版或教材复制。如有侵权，请联系删除。

---

## ✨ 功能特性

### 🎮 游戏玩法
- **配对消除**：点选「汉字卡」与「拼音卡」，配对成功即消除
- **7 个难度**：一年级 ~ 六年级 + 😈 地狱难度
- **实时统计**：得分、进度、连对、本轮错字、用时
- **连对奖励**：连对越多，得分越高
- **点字朗读**：一年级模式点击汉字卡即可听读音

### 📕 智能错字本
- 配对错误的字自动存入**错字库**
- 按年级**分别保存**在本机浏览器
- 下次开局**优先复习**错字
- 本会话内已过关的字**不再重复出现**
- 支持「只练错字」模式

### 🔊 朗读系统（本项目核心）
采用**三层降级**策略，确保各设备都能出声：

| 优先级 | 方案 | 说明 |
|---|---|---|
| 1️⃣ | **Web Audio + 预解码** | 音频提前解码成 `AudioBuffer`，时间轴精确调度，**零延迟无缝衔接** |
| 2️⃣ | **`<audio>` 元素** | 老浏览器降级，直接播放 mp3 |
| 3️⃣ | **本地 TTS** | 仅当 mp3 缺失时兜底 |

- 单字、组词、通关语音**全部使用预生成 mp3**
- **几乎不再依赖**浏览器/系统的语音合成引擎
- 音色统一、稳定、可控

### 🎨 界面设计
- 暖色调卡片式设计，适合儿童
- 地狱难度自动切换**红色主题**
- 完全响应式，适配手机 / 平板 / 电脑
- 朗读中的卡片有**呼吸光晕**反馈

---

## 🚀 在线体验

**https://game.leci04.top/**

---

## 🛠️ 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | 原生 HTML + CSS + JavaScript（**无框架、无依赖**） |
| 音频 | Web Audio API（预解码 + 时间轴调度） |
| 存储 | localStorage（错字库/进度）+ Cookie（通知已读） |
| 部署 | Cloudflare Pages |
| 音频生成 | Node.js 脚本 + Edge TTS Worker |

---

## 📁 项目结构

```
game-Chinese/
├── index.html              # 游戏主页面（单文件，含全部 CSS/JS）
├── zku-data.js             # 字库数据（汉字/拼音/组词）
├── audio/                  # 单字音频包
│   ├── 春.mp3
│   ├── 秋.mp3
│   └── ...
│   └── words/              # 组词 & 通关语音音频包
│       ├── 春天.mp3
│       ├── 万里无云.mp3
│       ├── 全部完成真棒.mp3
│       └── 太厉害了全部答对.mp3
├── logo.png                # 网站图标
├── reward.webp             # 赞赏码（可选）
├── _worker.js              # Cloudflare Pages 边缘函数（域名跳转）
├── LICENSE                 # GPL-3.0 开源协议
└── tools/                  # 音频生成脚本（开发用）
    ├── gen-audio.js        # 批量生成单字音频
    ├── gen-word-audio.js   # 批量生成组词音频
    ├── gen-phrase-audio.js # 生成通关语音
    └── fix-zku.js          # 字库修正脚本
```

---

## 🔧 本地运行

项目**纯静态**，无需构建。

```bash
# 方式 1：直接用浏览器打开 index.html（音频可能受 file:// 限制）
# 方式 2：起个本地服务器（推荐）
npx serve .
# 或
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

---

## 🔊 如何生成音频包

> 如果你想用自己的音色重新生成音频，可按以下步骤操作。

### 前置条件
- Node.js 18+
- 一个可用的 [Edge TTS Worker](https://github.com/wangwangit/tts)（或兼容 OpenAI TTS 格式的接口）

### 步骤

**1. 配置 Worker 地址**

编辑 `tools/gen-audio.js` 顶部的 `CONFIG`：
```js
const CONFIG = {
  WORKER_URL: 'https://你的域名',   // Edge TTS Worker 地址
  VOICE: 'zh-CN-XiaoxiaoNeural',    // 音色
  SPEED: 0.9,                       // 语速
  // ...
};
```

**2. 生成单字音频**
```bash
node tools/gen-audio.js --dry     # 先试运行
node tools/gen-audio.js --grade 1 # 先生成一个年级测试
node tools/gen-audio.js           # 全量生成
```

**3. 生成组词音频**
```bash
node tools/gen-word-audio.js
```

**4. 生成通关语音**
```bash
node tools/gen-phrase-audio.js
```

生成的音频会输出到 `audio/` 和 `audio/words/`。

---

## 📝 字库格式说明

`zku-data.js` 结构：

```js
const ZKU = {
  "1": [
    ["春", "chūn", "春天"],
    ["夏", "xià", "夏天"],
    // [汉字, 拼音, 组词]
  ],
  "2": [ /* ... */ ],
  // ...
  "hell": [ /* ... */ ]   // 地狱难度
};
```

---

## 🎨 自定义

| 想改什么 | 改哪里 |
|---|---|
| 主题色 | `index.html` 的 CSS 变量 `:root` |
| 每局卡片对数 | `const PAIR_N = 8` |
| 音色/语速 | `tools/gen-*.js` 的 `CONFIG` |
| 字库 | `zku-data.js` |
| 通关语音文案 | `index.html` 的 `PHRASE_WIN_OK` / `PHRASE_WIN_PERFECT` + 对应 mp3 文件名 |

---

## 🌐 浏览器兼容性

| 浏览器 | 支持 |
|---|---|
| Chrome / Edge（桌面 & 安卓） | ✅ 完整支持（Web Audio） |
| Safari（iOS / macOS） | ✅ 完整支持 |
| Firefox | ✅ 完整支持 |
| QQ / 微信 内置浏览器 | ✅ 支持（音频包方案） |
| 较老的浏览器 | ✅ 降级为 `<audio>` 播放 |

> 💡 由于全部使用音频包，**不再依赖系统语音引擎**，兼容性大幅提升。

---

## 📌 更新日志

### v4.1
- 🔇 单字、组词、通关语音全部改用**音频包**
- ⚡ 朗读改用 **Web Audio 预解码 + 时间轴精确调度**，消除弹窗延迟
- 🎯 组词与单字**无缝衔接**，几乎无需等待
- 🐛 修复朗读叠加、残留问题（会话令牌机制）
- 🌐 大幅提升各浏览器兼容性

### v4.0
- 🎧 优化浏览器兼容性，大幅减少对本地 TTS 的依赖

### v3.x
- 📢 下线在线 TTS，改回本地朗读
- 📕 错字本「过关」机制重构
- 🎨 界面改版

### v2.0
- 🎯 新增错字本、地狱难度
- 🎵 本地/在线朗读切换

### v1.0
- 🎮 初版发布

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

- 发现生字/拼音错误 → 欢迎反馈
- 想添加新功能 → 欢迎讨论

---

## 📄 开源协议

本项目采用 **[GNU General Public License v3.0](LICENSE)** 授权。

这意味着你可以自由地：

- ✅ 使用、修改、分发本项目
- ✅ 将其用于商业用途

但**必须**遵守以下条件：

- 📢 保留版权声明和本协议
- 🔓 你**修改后的版本也必须以 GPL 开源**（Copyleft 传染性）
- 📦 分发时需提供完整源码

> 完整条款见 [LICENSE](LICENSE) 文件，或访问 <https://www.gnu.org/licenses/gpl-3.0.html>。

---

## 🙏 致谢

- **字库**：人教部编版小学语文教材
- **TTS**：[VoiceCraft / wangwangit/tts](https://github.com/wangwangit/tts)（基于 Microsoft Edge TTS）
- **部署**：Cloudflare Pages

---

## 📮 反馈与支持

- 📧 邮箱：`aile-leci@mail.leci04.top`
- 💛 如果这个项目帮到了你的孩子，欢迎在游戏页面底部**赞助开发**

---

<p align="center"><i>© 2026 Aile & Leci · 保留所有权利</i></p>
```
