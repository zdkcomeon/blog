const learning = "/learningResource/";
const installation = "/softwareInstallation/";
const configuration = "/softwareConfiguration/";

const topic = (text, directory, pages) => ({
  text,
  link: `${learning}${directory}/`,
  collapsible: true,
  children: pages.map(([text, file]) => ({
    text,
    link: `${learning}${directory}/${file}.html`,
  })),
});

// 按阅读主题分组，保留原有文章地址。
export const sidebar = {
  [learning]: [
    { text: "学习总览", link: learning },
    topic("Java", "Java", [
      ["知识梳理与资料", "八股文"],
      ["面试准备", "面试题"],
      ["Java 集合与 HashMap", "collections"],
      ["Java 类型、字符串与泛型", "language-basics"],
      ["Java 并发、锁与 ThreadLocal", "concurrency"],
      ["Java 线程池与任务执行", "thread-pools"],
      ["CompletableFuture 异步编排", "completable-future"],
      ["Java I/O 与多路复用", "io-models"],
      ["JVM 内存与垃圾回收", "jvm-memory-gc"],
      ["JVM 类加载与字节码", "class-loading"],
      ["JVM 运行机制与对象布局", "jvm-internals"],
    ]),
    topic("MySQL", "mysql", [
      ["知识梳理与资料", "八股文"],
      ["面试准备", "面试题"],
      ["MySQL 日志与两阶段提交", "logs"],
      ["MySQL 缓冲池与数据存储", "storage"],
      ["MySQL 事务与 MVCC", "transactions"],
      ["MySQL 索引原理与优化", "indexes"],
      ["MySQL 锁与加锁规则", "locks"],
      ["MySQL SQL 执行与使用技巧", "sql-optimization"],
    ]),
    topic("计算机网络", "computer-networks", [
      ["知识梳理与资料", "八股文"],
      ["面试准备", "面试题"],
    ]),
    topic("操作系统", "os", [
      ["知识梳理与资料", "八股文"],
      ["面试准备", "面试题"],
      ["用户空间、Page Cache 与刷盘", "io-page-cache"],
    ]),
    topic("Redis", "redis", [
      ["Redis 数据结构与对象存储", "data-structures"],
      ["Redis 持久化与 Fork", "persistence"],
      ["Redis 主从复制与同步问题", "replication"],
      ["Redis Sentinel 与脑裂", "sentinel"],
      ["Redis Cluster 与数据分片", "cluster"],
      ["Redis List 与 Stream 消息队列", "message-queues"],
      ["Redis 性能、内存与缓冲区", "performance"],
      ["Redis 缓存策略与一致性", "cache"],
      ["Redis 原子操作、分布式锁与事务", "locks-transactions"],
    ]),
    topic("Kafka", "kafka", [
      ["Kafka 架构、性能与网络模型", "architecture"],
      ["Kafka 分区、日志与消息格式", "storage-messages"],
      ["Kafka 消息可靠性、幂等与事务", "reliability"],
      ["Kafka 消费与位移提交", "consumers-offsets"],
      ["Kafka 副本、ISR 与高水位", "replication"],
      ["Kafka 消费者组与重平衡", "rebalance"],
      ["Kafka 控制器与 ZooKeeper", "controller"],
      ["Kafka 监控指标", "monitoring"],
    ]),
    topic("Elasticsearch", "elasticsearch", [
      ["Elasticsearch 倒排索引资料", "inverted-index"],
    ]),
    topic("分布式系统", "distributed-systems", [
      ["分布式系统与高可用", "availability"],
    ]),
    {
      text: "框架",
      link: `${learning}frameword/`,
      collapsible: true,
      children: [
        topic("Spring", "frameword/Spring", [
          ["Spring 容器、FactoryBean 与循环依赖", "container"],
          ["Spring 事务传播与多数据源", "transactions"],
          ["Spring MVC 请求流程与拦截器", "mvc"],
        ]),
        // 原目录拼写为 SpirngBoot，保留路径以兼容已发布的链接。
        topic("Spring Boot", "frameword/SpirngBoot", [
          ["Spring Boot 启动与 Bean 生命周期", "startup"],
        ]),
        { text: "Spring Cloud", link: `${learning}frameword/SpringCloud/` },
        topic("MyBatis", "frameword/mybatis", [
          ["MyBatis 参数映射与主键回填", "mapping-keys"],
          ["MyBatis 缓存与延迟加载", "cache-lazy-loading"],
          ["MyBatis 分页查询", "pagination"],
        ]),
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
    { text: "Maven 依赖优先级笔记", link: `${configuration}maven-dependencies.html` },
    { text: "Git fetch、pull 与 rebase", link: `${configuration}git-sync.html` },
    { text: "Linux 文件与目录大小查看", link: `${configuration}linux-file-size.html` },
    { text: "IntelliJ IDEA 断点调试", link: `${configuration}idea-debug.html` },
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
    { text: "线上接口变慢排查提纲", link: "/tips/slow-interface-checklist.html" },
    { text: "大文件下载与分批读取", link: "/tips/large-file-processing.html" },
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
