import { practiceGroups, practiceOverview } from "./practice.js";

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
      { text: "Redis", link: "/learningResource/redis/" },
      { text: "Kafka", link: "/learningResource/kafka/" },
      { text: "Elasticsearch", link: "/learningResource/elasticsearch/" },
      { text: "分布式系统", link: "/learningResource/distributed-systems/" },
      { text: "框架", link: "/learningResource/frameword/" },
    ],
  },
  {
    text: "开发工具",
    children: [
      { text: "工具总览与安装", link: "/softwareInstallation/" },
      { text: "配置与使用", link: "/softwareConfiguration/" },
      { text: "Git 安装", link: "/softwareInstallation/git.html" },
      { text: "IDEA 配置", link: "/softwareConfiguration/idea.html" },
      { text: "Maven 依赖", link: "/softwareConfiguration/maven-dependencies.html" },
      { text: "Linux 文件大小", link: "/softwareConfiguration/linux-file-size.html" },
      { text: "Node.js 版本管理", link: "/softwareInstallation/nvm.html" },
    ],
  },
  {
    text: "实践笔记",
    children: [
      practiceOverview,
      ...practiceGroups.map(({ text, link }) => ({ text, link })),
    ],
  },
  {
    text: "AI 实践",
    children: [
      { text: "规则文件", link: "/ai-practice/rules/" },
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
  { text: "关于作者", link: "/about/" },
];
