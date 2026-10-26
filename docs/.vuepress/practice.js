// 实践笔记的专题与文章顺序由导航、侧栏共同使用。
export const practiceOverview = { text: "实践总览", link: "/tips/" };

export const practiceGroups = [
  {
    text: "开发与集成",
    link: "/tips/development/",
    children: [
      { text: "Java 与 Spring 编码技巧", link: "/tips/技巧积攒.html" },
      { text: "单元测试", link: "/tips/unitTest.html" },
      { text: "OpenFeign 定制配置", link: "/tips/记一次openFeign定制化使用.html" },
      { text: "大文件下载与分批读取", link: "/tips/large-file-processing.html" },
    ],
  },
  {
    text: "故障排查",
    link: "/tips/troubleshooting/",
    children: [
      { text: "常用中间件指令", link: "/tips/middleware-commands.html" },
      { text: "Kafka 类加载故障调查", link: "/tips/kafka-string-serializer.html" },
      { text: "Outbound 启动死锁调查", link: "/tips/outbound-startup-deadlock.html" },
      { text: "Notice 启动循环依赖调查", link: "/tips/notice-startup-circular-dependency.html" },
    ],
  },
  {
    text: "性能优化",
    link: "/tips/performance/",
    children: [
      { text: "线上接口变慢排查提纲", link: "/tips/slow-interface-checklist.html" },
      { text: "出单慢调查与优化", link: "/tips/policy-issuance-performance.html" },
    ],
  },
];
