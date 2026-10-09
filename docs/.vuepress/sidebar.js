const learning = "/learningResource/";
const installation = "/softwareInstallation/";
const configuration = "/softwareConfiguration/";

// 按阅读主题分组，保留原有文章地址。
export const sidebar = {
  [learning]: [
    { text: "学习总览", link: learning },
    ...[
      ["Java", "Java"],
      ["MySQL", "mysql"],
      ["计算机网络", "computer-networks"],
      ["操作系统", "os"],
    ].map(([text, directory]) => ({
      text,
      link: `${learning}${directory}/`,
      collapsible: true,
      children: [
        { text: "知识梳理与资料", link: `${learning}${directory}/八股文.html` },
        { text: "面试准备", link: `${learning}${directory}/面试题.html` },
      ],
    })),
    {
      text: "框架与数据库访问",
      link: `${learning}frameword/`,
      collapsible: true,
      children: [
        { text: "Spring", link: `${learning}frameword/Spring/` },
        // 原目录拼写为 SpirngBoot，保留路径以兼容已发布的链接。
        { text: "Spring Boot", link: `${learning}frameword/SpirngBoot/` },
        { text: "Spring Cloud", link: `${learning}frameword/SpringCloud/` },
        { text: "MyBatis", link: `${learning}frameword/mybatis/` },
      ],
    },
  ],
  [installation]: [
    { text: "工具总览", link: installation },
    {
      text: "开发环境",
      children: [
        { text: "IntelliJ IDEA", link: `${installation}idea.html` },
        { text: "JetBrains Toolbox", link: `${installation}JetBrains-Toolbox.html` },
        { text: "Git", link: `${installation}git.html` },
        { text: "TortoiseGit", link: `${installation}TortoiseGit.html` },
        { text: "JVMS · JDK 版本管理", link: `${installation}jvms.html` },
        { text: "NVM · Node.js 版本管理", link: `${installation}nvm.html` },
      ],
    },
    {
      text: "效率工具",
      children: [
        { text: "Snipaste · 截图贴图", link: `${installation}snipaste.html` },
        { text: "uTools · 快捷工具箱", link: `${installation}uTools.html` },
        { text: "draw.io · 图表绘制", link: `${installation}draw-io.html` },
        { text: "Trello · 任务看板", link: `${installation}trello.html` },
      ],
    },
    { text: "配置与使用", link: configuration },
  ],
  [configuration]: [
    { text: "配置总览", link: configuration },
    { text: "Git 配置与使用", link: `${configuration}git.html` },
    { text: "IntelliJ IDEA 配置", link: `${configuration}idea.html` },
    { text: "JetBrains 免费方案记录", link: `${configuration}JetBrains全家桶免费.html` },
    { text: "工具安装", link: installation },
  ],
  "/tips/": [
    { text: "实践总览", link: "/tips/" },
    { text: "常用中间件指令", link: "/tips/middleware-commands.html" },
    { text: "Java 与 Spring 编码技巧", link: "/tips/技巧积攒.html" },
    { text: "单元测试", link: "/tips/unitTest.html" },
    { text: "OpenFeign 定制配置", link: "/tips/记一次openFeign定制化使用.html" },
    { text: "Kafka 类加载故障调查", link: "/tips/kafka-string-serializer.html" },
    { text: "Outbound 启动死锁调查", link: "/tips/outbound-startup-deadlock.html" },
    { text: "Notice 启动循环依赖调查", link: "/tips/notice-startup-circular-dependency.html" },
    { text: "出单慢调查与优化", link: "/tips/policy-issuance-performance.html" },
  ],
  "/guide/": [
    { text: "文档地图", link: "/guide/" },
    { text: "学习资源", link: learning },
    { text: "开发工具", link: installation },
    { text: "实践笔记", link: "/tips/" },
    { text: "生活食谱", link: "/cookbook/" },
    { text: "关于作者", link: "/about/" },
  ],
  "/cookbook/": [{ text: "生活食谱", link: "/cookbook/" }],
  // 博客分类、标签和时间线使用独立布局，不显示文档侧边栏。
  "/": false,
};
