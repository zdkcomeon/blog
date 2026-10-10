---
title: Redis 专题
description: 从数据结构、持久化、主从复制到缓存、分布式锁与性能优化的复习入口。
category:
- 学习资源
tag:
- Redis
- 缓存
- 学习导航
article: false
pageInfo: false
---

从数据结构、持久化、主从复制到缓存、分布式锁与性能优化的复习入口。

## 主题笔记

| 文档 | 内容 |
| --- | --- |
| [Redis 数据结构与对象存储](./data-structures.md) | 整理 Redis 全局结构、字典与渐进式 Rehash、压缩列表、跳表、RedisObject 和键值设计。 |
| [Redis 持久化与 Fork](./persistence.md) | 整理 RDB、AOF、写回策略、日志重写、Fork 和混合持久化。 |
| [Redis 主从复制与同步问题](./replication.md) | 整理全量复制、增量复制、复制缓冲区、复制延迟、过期数据与同步配置。 |
| [Redis Sentinel 与脑裂](./sentinel.md) | 整理哨兵配置、节点下线判断、选举、主从切换和脑裂问题。 |
| [Redis Cluster 与数据分片](./cluster.md) | 整理哈希槽、请求重定向、扩缩容、故障恢复、数据倾斜和 Gossip 通信开销。 |
| [Redis List 与 Stream 消息队列](./message-queues.md) | 整理消息队列的基本问题，以及使用 List 和 Stream 实现消息队列的笔记。 |
| [Redis 性能、内存与缓冲区](./performance.md) | 整理阻塞操作、异步线程、CPU、响应延迟、内存碎片和缓冲区问题。 |
| [Redis 缓存策略与一致性](./cache.md) | 整理键过期、旁路缓存、内存淘汰、缓存与数据库一致性、缓存异常和 LRU、LFU。 |
| [Redis 原子操作、分布式锁与事务](./locks-transactions.md) | 整理 Redis 原子操作、单实例分布式锁、Redlock 和事务特性。 |

## 相关阅读

- [MySQL 专题](../mysql/)：结合数据库事务理解缓存一致性。
- [分布式系统专题](../distributed-systems/)：发布部署、分布式事务与缓存。
