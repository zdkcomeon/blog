export const topics = [
  {
    id: "learn", suit: "♠", rank: "A", name: "学习资源", english: "THE KNOWLEDGE",
    category: "学习资源", path: "/learningResource/", color: "ink",
    description: "从 Java 到计算机基础。把零散的知识，慢慢连成自己的体系。",
    keywords: "JAVA / MYSQL / REDIS",
  },
  {
    id: "practice", suit: "♦", rank: "K", name: "工程实践", english: "THE EXPERIENCE",
    category: "实践笔记", path: "/tips/", color: "red",
    description: "追过的堆栈，解过的难题。记录真实工程里，每一次恍然大悟。",
    keywords: "DEBUG / PERFORMANCE / SPRING",
  },
  {
    id: "tools", suit: "♣", rank: "Q", name: "开发工具", english: "THE TOOLBOX",
    category: "开发工具", path: "/softwareInstallation/", color: "ink",
    description: "工欲善其事，先把环境配好。收好这些让开发顺手一点的小工具。",
    keywords: "GIT / IDEA / WORKFLOW",
  },
  {
    id: "ai", suit: "♥", rank: "J", name: "AI 实践", english: "THE POSSIBILITY",
    category: "AI 实践", path: "/ai-practice/", color: "red",
    description: "与 AI 一起写代码，也一起探索。把新的可能，变成具体的实践。",
    keywords: "AI / AGENT / CODEX",
  },
];

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai",
});

// 与首页展示共用博客插件的数据；不依赖时间线是否收录这篇文章。
export const prepareArticles = (items) => items.map(({ path, info }) => {
  const value = info.date;
  const timestamp = typeof value === "number" || (typeof value === "string" && value.trim()) || value instanceof Date
    ? new Date(value).getTime()
    : NaN;
  const dated = Number.isFinite(timestamp);

  return {
    path,
    title: info.title,
    categories: Array.isArray(info.category) ? info.category : info.category ? [info.category] : [],
    description: String(info.excerpt ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    timestamp: dated ? timestamp : -Infinity,
    date: dated ? new Date(timestamp).toISOString() : "",
    dateText: dated ? dateFormatter.format(timestamp).replaceAll("/", ".") : "未注明日期",
  };
}).sort((left, right) => right.timestamp - left.timestamp);

export const filterArticles = (articles, category = "") => category
  ? articles.filter(({ categories }) => categories.includes(category))
  : articles;
