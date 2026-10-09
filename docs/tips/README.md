---
title: 实践笔记
description: 按指令速查、编码、测试、服务调用、性能优化和故障排查整理项目实践笔记。
category:
- 实践笔记
tag:
- 实践导航
article: false
pageInfo: false
---

从指令速查、日常代码、测试、服务集成、性能优化与故障排查六个方向整理项目中的经验。

| 方向 | 笔记 | 主要主题 |
| --- | --- | --- |
| 指令速查 | [常用中间件指令](./middleware-commands.md) | Arthas、类加载器、方法耗时、Java Agent、Git rebase 与 stash |
| 日常编码 | [Java 与 Spring 编码技巧](./技巧积攒.md) | 函数式代码、JSON、Redisson 与依赖注入 |
| 测试 | [单元测试](./unitTest.md) | JUnit 5、Mockito、MockMvc、真实 SQL 与异常边界 |
| 服务调用 | [OpenFeign 定制配置](./记一次openFeign定制化使用.md) | HC5 客户端隔离、连接池、代理、授权与超时验证 |
| 故障排查 | [Kafka StringSerializer 类加载调查](./kafka-string-serializer.md) | 公共线程池、延迟初始化、TCCL 与修复边界 |
| 故障排查 | [Outbound 启动死锁调查](./outbound-startup-deadlock.md) | jstack 证据、Spring 注册表锁、监控懒加载与修复方案 |
| 故障排查 | [Notice 启动循环依赖调查](./notice-startup-circular-dependency.md) | 消费者与生产者依赖环、Async 代理、早期引用与注入点懒加载 |
| 性能优化 | [出单慢问题调查与优化分享](./policy-issuance-performance.md) | 分阶段日志、Arthas trace、SQL 次数分析、配置缓存与 PT 验证 |

测试与服务调用笔记包含配置步骤、代码示例和验证清单；文章保留原有发布日期。

需要补充原理时，查看 [学习资源](../learningResource/)；需要准备环境时，查看 [开发工具](../softwareInstallation/)。
