import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";
import { navbar } from "./navbar.js";
import { sidebar } from "./sidebar.js";
import { timelinePath } from "./timeline.js";

const configRequire = createRequire(import.meta.url);
const themeRequire = createRequire(configRequire.resolve("vuepress-theme-hope"));

export default defineUserConfig({
  base: "/blog/",
  lang: "zh-CN",
  title: "可爱团子随记",
  description: "Java 学习资源、开发工具配置与工程实践笔记",
  head: [["link", { rel: "icon", href: "/blog/logo.png" }]],
  host: "127.0.0.1",
  port: 9090,
  alias: {
    "@vuepress/plugin-blog/client": themeRequire.resolve("@vuepress/plugin-blog/client"),
    "@theme-hope/composables/blog/useTimeline": fileURLToPath(new URL("./composables/useTimeline.js", import.meta.url)),
  },
  plugins: [
    {
      name: "complete-blog-timeline",
      extendsPage(page) {
        if (page.frontmatter.timeline === false) page.routeMeta.timeline = false;
      },
    },
  ],
  bundler: viteBundler({
    viteOptions: {
      plugins: [
        {
          name: "fix-slimsearch-dev-worker-url",
          enforce: "pre",
          transform(code, id) {
            if (!id.includes("/@vuepress/plugin-slimsearch/dist/client/config.js")) {
              return;
            }
            // rc.137 的 Worker 位于 dist/worker，而不是 dist/client/worker。
            return code.replace(
              /new URL\(`worker\/dev\.js`,\s*import\.meta\.url\)/,
              'new URL("../worker/dev.js", import.meta.url)',
            );
          },
        },
      ],
      ssr: {
        // 将搜索组件的 CSS 交给 Vite 处理，避免 Node 在静态渲染时加载 CSS。
        noExternal: ["@vuepress/search-helper"],
      },
    },
  }),
  theme: hopeTheme({
    hostname: "https://zdkcomeon.github.io",
    author: "满觉陇",
    logo: "/logo.png",
    repo: "zdkcomeon/blog",
    docsDir: "docs",
    docsBranch: "master",
    sidebar,
    pageInfo: ["Date", "Category", "Tag", "ReadingTime"],
    blog: {
      name: "满觉陇",
      avatar: "/logo.png",
      intro: "/about/",
      description: "Java 学习资源、开发工具配置与工程实践笔记",
      timeline: "时间线",
    },
    navbar,
    markdown: {
      highlighter: { type: "shiki", lineNumbers: true },
      hint: true,
    },
    plugins: {
      blog: { timeline: timelinePath, excerpt: false },
      slimsearch: {
        // 单语言站点使用字符串格式，兼容开发模式注入的搜索配置。
        customFields: [
          {
            getter: (page) => page.frontmatter.category,
            formatter: "分类：$content",
          },
          {
            getter: (page) => page.frontmatter.tag,
            formatter: "标签：$content",
          },
        ],
      },
      // 本站没有自定义图标，无需加载额外的图标 CDN。
      icon: false,
      comment: false,
    },
  }, { custom: true }),
});
