---
title: 故障排查
description: 按现场诊断、Kafka 类加载异常、服务启动死锁与循环依赖查找排障记录。
category:
- 实践笔记
tag:
- 实践导航
article: false
pageInfo: false
---

先根据故障现象找到相近的调查记录，再结合日志、线程栈和运行环境核对原因。

## 诊断命令速查

[常用中间件指令](../middleware-commands.md) 汇总 Arthas 启动、类加载器排查、方法耗时分析、Java Agent 启动，以及 Git rebase 与 stash 命令。

## 按故障现象选择

| 故障现象 | 调查记录 | 定位重点 |
| --- | --- | --- |
| 并行发送 Kafka 消息时找不到 StringSerializer | [Kafka 类加载故障调查](../kafka-string-serializer.md) | 公共线程池、延迟初始化与线程上下文类加载器 |
| Outbound 启动卡住，没有明确报错 | [Outbound 启动死锁调查](../outbound-startup-deadlock.md) | jstack 证据、Spring 注册表锁与监控依赖懒加载 |
| Notice 启动报 BeanCurrentlyInCreationException | [Notice 启动循环依赖调查](../notice-startup-circular-dependency.md) | 消费者与生产者依赖环、Async 代理与早期引用 |

主要现象是接口变慢时，进入 [性能优化](../performance/) 查找排查提纲和优化案例。
