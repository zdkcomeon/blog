---
title: Kafka 专题
description: 从架构、日志存储到消息可靠性、消费位移、副本与集群管理的复习入口。
category:
- 学习资源
tag:
- Kafka
- 消息队列
- 学习导航
article: false
pageInfo: false
---

从架构、日志存储到消息可靠性、消费位移、副本与集群管理的复习入口。

## 主题笔记

| 文档 | 内容 |
| --- | --- |
| [Kafka 架构、性能与网络模型](./architecture.md) | 整理 Kafka 基础、零拷贝、页缓存、生产与消费优化、TCP 连接和 Reactor 网络模型。 |
| [Kafka 分区、日志与消息格式](./storage-messages.md) | 整理分区、日志段、索引、消息定位、日志清理、RecordBatch 与消息压缩。 |
| [Kafka 消息可靠性、幂等与事务](./reliability.md) | 整理消息一致性、消息丢失场景、可靠性配置、幂等生产者和事务生产者。 |
| [Kafka 消费与位移提交](./consumers-offsets.md) | 整理 poll 参数、自动与手动位移提交、重复消费和消息顺序。 |
| [Kafka 副本、ISR 与高水位](./replication.md) | 整理 Kafka 高可用、副本分布、ISR、Leader 选举、HW、LEO 和 Leader Epoch。 |
| [Kafka 消费者组与重平衡](./rebalance.md) | 整理 Coordinator、消费者心跳、组状态机、重平衡流程和位移处理。 |
| [Kafka 控制器与 ZooKeeper](./controller.md) | 整理基于 ZooKeeper 的控制器职责、保存的数据、选举和故障转移笔记。 |
| [Kafka 监控指标](./monitoring.md) | 整理消费进度、Lag、Broker 主机、JVM、集群和 JMX 监控提纲。 |

## 相关阅读

- [Redis 消息队列](../redis/message-queues.md)：List 与 Stream 的使用笔记。
- [Kafka 类加载故障调查](../../tips/kafka-string-serializer.md)：结合项目排查生产者初始化问题。
