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

GitHub 部署工作流使用自动生成的 `GITHUB_TOKEN` 和 `contents: write` 权限，将静态产物推送到 `gh-pages` 分支。GitHub Pages 的发布来源应设置为该分支的根目录。

## 站点配置

- 配置入口：`docs/.vuepress/config.js`，使用 ESM、Vite 和 Hope 主题。
- 版本固定为 VuePress `2.0.0-rc.31`、Hope `2.0.0-rc.110`；两者仍为候选版本，升级时需核对兼容性。
- 首页采用 Hope 的 `Blog` 布局，提供学习资源、开发工具、实践笔记和文档地图入口。
- 顶部导航定义在 `docs/.vuepress/navbar.js`，侧边栏在 `docs/.vuepress/sidebar.js` 按主题分组。
- 主分类统一为学习资源、开发工具、实践笔记、生活记录；标签同时描述技术主题与文档用途。
- 文章元数据使用 `category`、`tag` 和 `YYYY-MM-DD` 格式的 `date`。
- 时间线汇总正文文章；有日期的文章按年份和日期倒序排列，无日期的文章显示在未注明日期分组。首页侧栏与时间线页面使用同一份数据，`timeline: false` 可排除特定文章。
- 时间线逻辑位于 `docs/.vuepress/timeline.js`，通过 Hope 自定义模式和 `composables/useTimeline.js` 接入主题。
- 新文档填写明确的 `title` 和 `description`，使用 Git、MySQL、Node.js 等统一名称。保留原有发布日期，未记录日期的页面无需补写日期。
- 页面标题由主题根据 `title` 显示，正文从简介或二级标题开始，避免重复的一级标题。
- 文章图片放在对应目录的 `imgs/` 下，并使用相对路径引用；新导入的图片先下载并确认可读取，下载失败时保留原地址。
- 专题目录与复习导航设置 `article: false`，让首页文章列表、分类与时间线集中展示资料和笔记。
- 新增或调整文档时同步维护 `docs/guide/README.md` 的完整目录，以及相关专题入口。原有路径继续保留以兼容已发布的链接。
- 页面公开访问，不配置全局或文章密码。旧 Reco 密码入口及 VuePress 1 看板娘插件已移除。

本仓库尚未配置单元测试套件。验证升级时应检查生产构建、首页和文章直接访问，以及分类、标签、时间线页面；仅启动进程不足以证明页面可用。
