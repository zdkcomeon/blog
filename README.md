# HHS 博客

基于 VuePress 2 和 [VuePress Theme Hope](https://theme-hope.vuejs.press/zh/guide/) 的中文博客。

## 本地开发

使用 `.nvmrc` 指定的 Node.js 24.19.0（VuePress 要求 Node.js 22.18.0 及以上）。

```bash
npm ci
npm run docs
```

开发服务默认使用 9090 端口，站点路径为 `/blog/`。

```bash
npm run docs:build
```

静态产物位于 `docs/.vuepress/dist`，供 GitHub Pages 使用。仓库中的两套构建配置均使用新版 Node 和 `npm ci`；请保留并提交 `package-lock.json`。

## 站点配置

- 配置入口：`docs/.vuepress/config.js`，使用 ESM、Vite 和 Hope 主题。
- 版本固定为 VuePress `2.0.0-rc.31`、Hope `2.0.0-rc.110`；两者仍为候选版本，升级时需核对兼容性。
- 首页采用 Hope 的 `Blog` 布局，保留分类、标签、时间线和自动侧边栏。
- 文章元数据使用 `category`、`tag` 和 `YYYY-MM-DD` 格式的 `date`。
- 页面公开访问，不配置全局或文章密码。旧 Reco 密码入口及 VuePress 1 看板娘插件已移除。

本仓库尚未配置单元测试套件。验证升级时应检查生产构建、首页和文章直接访问，以及分类、标签、时间线页面；仅启动进程不足以证明页面可用。
