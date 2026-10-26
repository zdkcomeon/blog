---
title: 性能优化
description: 从线上接口变慢排查提纲进入，结合出单链路案例理解耗时定位、查询与缓存优化。
category:
- 实践笔记
tag:
- 实践导航
article: false
pageInfo: false
---

先确定耗时来自哪一段，再查看具体案例中的分析方法和验证结果。

## 排查思路与实战案例

| 需要解决的问题 | 笔记 | 主要内容 |
| --- | --- | --- |
| 接口变慢，先确定从哪里查 | [线上接口变慢排查提纲](../slow-interface-checklist.md) | 慢 SQL、中间件与第三方依赖三个方向；目前为待完善的提纲 |
| 参考一次性能问题的调查与优化 | [出单慢调查与优化](../policy-issuance-performance.md) | 分阶段日志、Arthas trace、SQL 次数分析、配置缓存与 PT 验证 |

需要现场跟踪类加载或方法耗时时，可结合 [常用中间件指令](../middleware-commands.md)；服务启动异常与死锁案例集中在 [故障排查](../troubleshooting/)。
