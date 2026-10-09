---
title: 实践笔记
description: 按编码、测试、服务调用和故障排查整理项目实践笔记。
category:
- 实践笔记
tag:
- 实践导航
article: false
pageInfo: false
---

从日常代码、测试、服务集成与故障排查四个方向整理项目中的经验。

| 方向 | 笔记 | 主要主题 |
| --- | --- | --- |
| 日常编码 | [Java 与 Spring 编码技巧](./技巧积攒.md) | 函数式代码、JSON、Redisson 与依赖注入 |
| 测试 | [单元测试](./unitTest.md) | JUnit 5、Mockito、MockMvc、真实 SQL 与异常边界 |
| 服务调用 | [OpenFeign 定制配置](./记一次openFeign定制化使用.md) | HC5 客户端隔离、连接池、代理、授权与超时验证 |
| 故障排查 | [Kafka StringSerializer 类加载调查](./kafka-string-serializer.md) | 公共线程池、延迟初始化、TCCL 与修复边界 |
| 故障排查 | [Outbound 启动死锁调查](./outbound-startup-deadlock.md) | EKS 升级背景、Bean 初始化顺序、异步等待与修复方案 |

测试与服务调用笔记包含配置步骤、代码示例和验证清单；文章保留原有发布日期。

需要补充原理时，查看 [学习资源](../learningResource/)；需要准备环境时，查看 [开发工具](../softwareInstallation/)。
