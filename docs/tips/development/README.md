---
title: 开发与集成
description: 按日常编码、自动化测试、服务调用与大文件处理查找开发实践。
category:
- 实践笔记
tag:
- 实践导航
article: false
pageInfo: false
---

编写业务代码、验证行为或接入外部服务时，从对应场景进入。

## 按开发场景选择

| 场景 | 笔记 | 主要内容 |
| --- | --- | --- |
| 整理可复用的编码方法 | [Java 与 Spring 编码技巧](../技巧积攒.md) | 函数式异常处理、JSON、Redisson 锁封装与 Spring 注入 |
| 为业务逻辑和接口补测试 | [单元测试](../unitTest.md) | JUnit 5、Mockito、MockMvc、MyBatis 测试切片与异常边界 |
| 配置第三方 HTTP 服务调用 | [OpenFeign 定制配置](../记一次openFeign定制化使用.md) | HC5 客户端隔离、连接池、代理、授权与超时验证 |
| 下载或读取大文件 | [大文件下载与分批读取](../large-file-processing.md) | 分段传输、流式下载与分批读写 |

服务无法启动或调用异常时，查看 [故障排查](../troubleshooting/)；接口耗时增加时，查看 [性能优化](../performance/)。
