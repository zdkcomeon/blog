---
title: 实践笔记
description: 按开发与集成、故障排查、性能优化三个专题查找项目实践笔记。
category:
- 实践笔记
tag:
- 实践导航
article: false
pageInfo: false
---

按当前要解决的问题选择专题，进入后可从侧栏继续阅读同类笔记。

## 按专题查找

| 专题 | 内容与使用场景 |
| --- | --- |
| [开发与集成](./development/) | Java 与 Spring 编码、单元测试、OpenFeign 接入、大文件处理 |
| [故障排查](./troubleshooting/) | 诊断命令速查、Kafka 类加载异常、服务启动死锁与循环依赖 |
| [性能优化](./performance/) | 线上接口变慢排查、出单链路调查、查询与缓存优化 |

## 按现象直达

| 遇到的问题 | 对应笔记 |
| --- | --- |
| 并行发送 Kafka 消息时找不到 StringSerializer | [Kafka 类加载故障调查](./kafka-string-serializer.md) |
| 服务启动卡住，没有明确报错 | [Outbound 启动死锁调查](./outbound-startup-deadlock.md) |
| Spring 启动报循环依赖，涉及异步代理 | [Notice 启动循环依赖调查](./notice-startup-circular-dependency.md) |
| 线上接口变慢，需要先确定排查方向 | [线上接口变慢排查提纲](./slow-interface-checklist.md) |
| 想查看一次完整的性能调查与优化记录 | [出单慢调查与优化](./policy-issuance-performance.md) |

需要查 Arthas、Java Agent 或 Git 命令时，直接打开 [常用中间件指令](./middleware-commands.md)。

需要补充原理时，查看 [学习资源](../learningResource/)；需要准备环境时，查看 [开发工具](../softwareInstallation/)。
