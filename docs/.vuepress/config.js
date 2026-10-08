import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  base: "/blog/",
  lang: "zh-CN",
  title: "HHS",
  description: "资源、教程、软件、工具、配置",
  head: [["link", { rel: "icon", href: "/blog/logo.png" }]],
  host: "127.0.0.1",
  port: 9090,
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
    author: "谦毅",
    logo: "/logo.png",
    repo: "zdkcomeon/blog",
    docsDir: "docs",
    docsBranch: "master",
    sidebar: "structure",
    blog: {
      name: "谦毅",
      avatar: "/logo.png",
      description: "资源、教程、软件、工具、配置",
      timeline: "TimeLine",
    },
    navbar: [
      {
        "text": "首页",
        "link": "/"
      },
      {
        "text": "分类",
        "link": "/category/"
      },
      {
        "text": "标签",
        "link": "/tag/"
      },
      {
        "text": "学习资源",
        "link": "/learningResource/",
        "children": [
          {
            "text": "Java",
            "children": [
              {
                "text": "八股文",
                "link": "/learningResource/Java/八股文"
              },
              {
                "text": "面试题",
                "link": "/learningResource/Java/面试题"
              }
            ]
          },
          {
            "text": "Mysql",
            "children": [
              {
                "text": "八股文",
                "link": "/learningResource/mysql/八股文"
              },
              {
                "text": "面试题",
                "link": "/learningResource/mysql/面试题"
              }
            ]
          },
          {
            "text": "计算机网络",
            "children": [
              {
                "text": "八股文",
                "link": "/learningResource/computer-networks/八股文"
              },
              {
                "text": "面试题",
                "link": "/learningResource/computer-networks/面试题"
              }
            ]
          },
          {
            "text": "操作系统",
            "children": [
              {
                "text": "八股文",
                "link": "/learningResource/os/八股文"
              },
              {
                "text": "面试题",
                "link": "/learningResource/os/面试题"
              }
            ]
          },
          {
            "text": "框架",
            "link": "/learningResource/frameword/",
            "children": [
              {
                "text": "Spring",
                "link": "/learningResource/frameword/Spring/"
              },
              {
                "text": "SpringBoot",
                "link": "/learningResource/frameword/SpringBoot/"
              },
              {
                "text": "SpringCloud",
                "link": "/learningResource/frameword/SpringCloud/"
              }
            ]
          }
        ]
      },
      {
        "text": "软件配置",
        "link": "/softwareConfiguration/",
        "children": [
          {
            "text": "IDEA配置",
            "link": "/softwareConfiguration/idea"
          },
          {
            "text": "GIt配置",
            "link": "/softwareConfiguration/git"
          },
          {
            "text": "JetBrains免费方案",
            "link": "/softwareConfiguration/JetBrains全家桶免费"
          }
        ]
      },
      {
        "text": "推荐与安装",
        "link": "/softwareInstallation/",
        "children": [
          {
            "text": "开发软件",
            "children": [
              {
                "text": "IDEA",
                "link": "/softwareInstallation/idea"
              },
              {
                "text": "GIt",
                "link": "/softwareInstallation/git"
              },
              {
                "text": "TortoiseGit小乌龟",
                "link": "/softwareInstallation/TortoiseGit"
              },
              {
                "text": "JVMS jdk管理",
                "link": "/softwareInstallation/jvms"
              },
              {
                "text": "NVM node管理",
                "link": "/softwareInstallation/nvm"
              },
              {
                "text": "JetBrains Toolbox",
                "link": "/softwareInstallation/JetBrains-Toolbox"
              }
            ]
          },
          {
            "text": "效率软件",
            "children": [
              {
                "text": "snipaste",
                "link": "/softwareInstallation/snipaste"
              },
              {
                "text": "uTools",
                "link": "/softwareInstallation/uTools"
              },
              {
                "text": "draw.io",
                "link": "/softwareInstallation/draw-io"
              },
              {
                "text": "trello",
                "link": "/softwareInstallation/trello"
              }
            ]
          }
        ]
      },
      {
        "text": "总结与分享",
        "children": [
          {
            "text": "技巧积攒",
            "link": "/tips/技巧积攒"
          },
          {
            "text": "单元测试",
            "link": "/tips/unitTest"
          },
          {
            "text": "记一次openFeign的定制化使用",
            "link": "/tips/记一次openFeign定制化使用"
          }
        ]
      },
      {
        "text": "孤独程序员食谱",
        "link": "/cookbook/"
      },
      {
        "text": "TimeLine",
        "link": "/timeline/"
      },
      {
        "text": "关于我",
        "link": "https://blog.isww.cn/"
      }
    ],
    markdown: {
      highlighter: { type: "shiki", lineNumbers: true },
      hint: true,
    },
    plugins: {
      blog: { timeline: "/timeline/" },
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
  }),
});
