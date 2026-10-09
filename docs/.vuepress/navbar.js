export const navbar = [
  { text: "首页", link: "/" },
  {
    text: "学习资源",
    children: [
      { text: "学习总览", link: "/learningResource/" },
      { text: "Java", link: "/learningResource/Java/" },
      { text: "MySQL", link: "/learningResource/mysql/" },
      { text: "计算机网络", link: "/learningResource/computer-networks/" },
      { text: "操作系统", link: "/learningResource/os/" },
      { text: "框架与数据库访问", link: "/learningResource/frameword/" },
    ],
  },
  {
    text: "开发工具",
    children: [
      { text: "工具总览与安装", link: "/softwareInstallation/" },
      { text: "配置与使用", link: "/softwareConfiguration/" },
      { text: "Git 安装", link: "/softwareInstallation/git.html" },
      { text: "IDEA 配置", link: "/softwareConfiguration/idea.html" },
      { text: "Node.js 版本管理", link: "/softwareInstallation/nvm.html" },
    ],
  },
  {
    text: "实践笔记",
    children: [
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
  },
  { text: "文档地图", link: "/guide/" },
  {
    text: "发现",
    children: [
      { text: "按分类浏览", link: "/category/" },
      { text: "按标签查找", link: "/tag/" },
      { text: "生活食谱", link: "/cookbook/" },
    ],
  },
  { text: "时间线", link: "/timeline/" },
  { text: "关于作者", link: "https://blog.isww.cn/" },
];
