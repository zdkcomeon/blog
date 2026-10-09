---
title: 调查报告：出单慢问题调查与优化分享
star: true
description: 通过分阶段日志、Arthas trace 和 SQL 次数分析定位出单链路中的商品配置重复查询与缓存周期性失效，记录两阶段缓存优化及 PT 验证结果。
date: 2026-10-09
category:
  - 实践笔记
tag:
  - Java
  - Arthas
  - MySQL
  - Redis
  - 缓存
  - 性能优化
  - 故障排查
---

运维监控发现，特定时段保单生成耗时明显增加。本次调查通过阶段日志、PT 环境复现、Arthas 方法跟踪和 SQL 次数分析，将优化重点定位到 Market 服务的**商品配置查询**与**商品实例化**：重复读取相对静态的配置，以及 300 秒缓存到期后的重新加载，共同造成耗时波动。

原稿记录，分两阶段增加或延长配置缓存后，PT 环境商品拆分接口的平均耗时约从 **800ms 降至 150ms**。这是商品拆分接口的阶段结果，完整出单链路还包含保存投保单、外部 XD 核保等环节。

本文保留抽样数据、代码概要、SQL 示例和全部 21 张截图。原稿中的飞书内嵌内容未随文本导出，流程说明依据已提供的文字整理。

## 问题背景与调查范围

| 项目 | 记录 |
| --- | --- |
| 现象 | 特定时段出单耗时增加，原稿记录中高耗时约在 800～1500ms 间波动。 |
| 影响 | 用户等待时间增加，操作效率下降；原稿未给出受影响请求占比或事故等级。 |
| 初始问题 | 是否由新业务代码引入性能问题。 |
| 复现环境 | PT；原稿记录其配置与 PRD 一致，调查在 PT 进行，避免直接操作生产。 |
| 调查对象 | 商品拆分、商品配置试算查询、商品实例化，并观察外部 XD 调用。 |
| 证据时间 | 压测截图包含 2025-04-22、2025-04-24 的日志，Arthas 截图包含 2025-06-12 的记录；原稿未提供完整实施时间线。 |

现有材料支持重复数据库查询和缓存失效是重要耗时来源，但没有提供新旧业务代码、依赖或发布版本的完整对比，因此尚不能把问题归因到某次新业务提交。

## 出单流程与观测方法

### 主要流程及日志入口

| 阶段 | 说明 | 日志标识 |
| --- | --- | --- |
| 保单创建入口 | `policyNew createIssuance`，观察整体出单耗时。 | `policyNew createIssuance costs:{}ms` |
| 商品拆分 | `GoodsSplit`，查询商品配置、试算并实例化。 | `商品拆分结束耗时{}` |
| 保存投保单 | `saveIssuance`。 | `saveIssuance complete, ms{}` |
| XD 核保 | 调用外部 XD 服务。 | `调用xd服务结束{},耗时结束时间{}` |
| 投保接口完成 | `CreateIssuanceLogic` 核保结束。 | `CreateIssuanceLogic-->createIssuance核保结束耗时{}` |
| 后续业务 | Kafka 消息及 Fusion 交互。 | 原稿未提供独立耗时标识。 |

以同一保单或 trace 对齐日志，再比较阶段耗时。入口总耗时和内部方法耗时可能存在包含关系，不能把表中所有指标直接相加；后续 Kafka、Fusion 交互也不能仅凭这组日志判断是否计入同步出单耗时。

### PT 环境抽样

在 PT 环境生成多张保单，按商品、产品数和 XD 规则数整理日志。下表保留原稿数据，耗时单位统一为 **ms**。

| 保单号 | 出单总耗时 | 商品拆分 | XD | 创建投保单总耗时 | 商品 | 产品数 | XD 规则数 |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| SYG101136860 | 1572 | 326 | 323 | 1422 | Yahoo 长期自行车 | 4 | 4 |
| SAF306157003 | 1378 | 411 | 87 | 1314 | PayPay 长期登山 | 6 | 8 |
| 00Y2P1436574 | 1263 | 183 | 61 | 1029 | PayPay 短期自动车 | 3 | 2 |
| SAG303734007 | 938 | 111 | 45 | 814 | PayPay 长期自行车 | 2 | 5 |
| SAG303735002 | 940 | 100 | 57 | 869 | PayPay 长期自行车 | 2 | 5 |
| SRA110079002 | 1063 | 250 | 53 | 992 | Resona 短期高尔夫 | 6 | 4 |

这组样本中，商品拆分为 100～411ms，XD 调用为 45～323ms，不同阶段都存在波动。产品数较多的商品出现了更高的拆分耗时，值得进一步核查查询次数；但六条样本不足以证明产品类型或 XD 规则数与总耗时存在稳定的强相关关系。

## 排查过程与瓶颈定位

### 轮询商品，观察拆分耗时

商品拆分需要获取商品明细、计划、约定、责任等配置。调查先轮询 PayPay 商品出单，验证不同商品的耗时差异。

原稿记录部分商品相差约 2～3 倍，截图也显示不同请求间存在明显波动。此轮排查开启了 Arthas，方法增强会影响测量值，应结合未开启增强时的业务日志评估实际耗时。

![轮询商品出单时的商品拆分耗时记录](/reports/policy-issuance-performance/goods-split-product-comparison.png)

### 使用 Arthas trace 找到耗时子调用

```text
trace com.zhongan.graphene.market.scenario.service.goods.support.handler.strategy.GoodsSplitAdapter goodInstantiation
```

一次 trace 中，`GoodsSplitAdapter#goodInstantiation` 总耗时约 960.21ms，两个子调用占据了主要时间：

| 子调用 | 本次耗时 | 本次占比 | 后续排查方向 |
| --- | ---: | ---: | --- |
| `IGoodsCalService#componentCal` | 约 621.35ms | 64.71% | 查询试算所需的配置及公式，入参不同会影响查询内容。 |
| `IMarketComponentService#goodInstantiation` | 约 305.51ms | 31.82% | 试算完成后的商品实例化与配置加载。 |

这些比例来自单次调用，用于选择继续跟踪的方法。

![GoodsSplitAdapter 方法跟踪，标出 componentCal 和 goodInstantiation 耗时](/reports/policy-issuance-performance/goods-split-arthas-trace.png)

## 关键方法分析

### componentCal：配置查询次数随商品结构增长

`componentCal` 查询商品基本信息，并进行渠道、计划、特约等相关试算。继续跟踪其内部调用后，一次 `calculatePremium` 记录显示：总耗时约 233.39ms，其中 `query` 约 164.65ms，占 70.55%；`compute` 约 57.68ms，占 24.71%。配置查询是这一调用中的主要时间来源。

![试算内部方法跟踪，query 占据主要耗时](/reports/policy-issuance-performance/component-cal-trace.png)

原稿中的查询代码概要如下，主要职责是加载商品配置：

```java
private void queryGoods(
        Page<GoodsComponentRequestDTO> request,
        ResultBase<Page<GoodsComponentResponseDTO>> result) {
    // 商品基本信息、渠道扩展等。
    queryGoodsBasic(request, result);
    // 商品计划。
    queryGoodsPlan(request, result);
    // 计划特约。
    queryGoodsPlanAgreement(request, result);
    // 计划配置的服务信息。
    queryGoodsPlanService(request, result);
    // 商品组合、产品和责任。
    queryGoodsPackage(request, result);
}
```

SQL 次数统计揭示了商品结构对查询开销的影响：

| 查询方法 | 原稿记录的 SQL 次数 | 查询内容或增长原因 |
| --- | --- | --- |
| `queryGoodsBasic` | 9 次及以上 | 商品、渠道扩展、计划、团体约定等；部分查询按商品循环。 |
| `queryGoodsPlan` | 2 次 | 商品计划及渠道扩展。 |
| `queryGoodsPlanAgreement` | 1 次 | 计划特约。 |
| `queryGoodsPlanService` | 1 次 | 计划服务。 |
| `queryGoodsPackage` | 5～21 次 | 组合、险种、责任及扩展；责任查询按险种循环。 |
| 整体查询 | 样例中约 18～34 次 | 随商品配置和险种数量变化。 |

原稿按一次数据库交互约 10ms 估算，18～34 次交互对应约 180～340ms。这是用于解释瓶颈的估算，数据库网络延迟、执行时间和缓存状态都会改变结果；原稿同时指出 PRD 单次交互可能仅需几毫秒。

`queryGoodsPackage` 并非固定执行 21 次 SQL，21 次是记录中的高值。其责任及扩展查询在险种循环中重复执行，产生了查询次数随险种数量增加的放大效应。具体 SQL 见文末附录。

### goodInstantiation：大量查询与短周期缓存叠加

商品实例化用于生成后续保单所需的数据。原稿记录，一个包含 3 个产品的样例执行了 **49 次 SQL 查询**。

| 项目 | 原稿记录 |
| --- | --- |
| 通用查询 | 约 22 次 SQL，按每次 10ms 估算约 220ms。 |
| 险种相关查询 | 次数随险种数量增加，原稿估算耗时约 90～810ms。 |
| 合计估算 | 约 310～1030ms；实际截图中也可见超过 1000ms 的请求。 |
| 原缓存策略 | 有效期 300 秒，无访问续期机制；到期后重新查询数据库。 |

同一商品在缓存有效期间，后续请求能复用结果；首次访问或缓存过期后的访问则需要回源。不同商品的险种数量又影响回源时的 SQL 次数，因此存在两类波动：**同一商品在缓存失效后再次变慢，不同商品在冷缓存状态下耗时不同**。

## 原因分析与两阶段优化

### 查询和缓存共同影响稳定性

Market 中的商品、计划、责任等配置相对静态，在配置未变化时重复读取相同数据，会持续产生数据库交互开销。原有 300 秒固定有效期又让活跃商品周期性回到冷缓存状态。

固定 TTL 本身并不意味着必须增加访问续期。此次记录的问题是：高频访问、配置变化频率和缓存有效期没有匹配，且回源代价较高。延长有效期能减少回源次数，同时需要处理配置更新后的失效。

### 实施方案

| 阶段 | 优化对象 | 原稿中的改动 |
| --- | --- | --- |
| 第一阶段 | 商品拆分中的配置查询 | 增加缓存，存储完整查询结果，有效期设置到当日结束。 |
| 第二阶段 | 商品实例化 | 将原有 300 秒缓存有效期延长到当日结束。 |

两个阶段都以复用配置数据、减少重复 SQL 为目标。同一缓存键在未更新、未淘汰且持续命中的前提下，可在当天复用首次加载的结果；首次访问、到期或失效后仍需重新加载。

原稿未提供缓存键、配置变更通知、并发回源和异常降级的实现代码，下面的效果分析按已记录的两阶段改动展开。

## 优化效果与证据

### 结果口径

| 观测对象 | 优化前或冷缓存 | 优化后或命中缓存 | 环境与解释 |
| --- | --- | --- | --- |
| 配置查询，本地验证 | 首次加载 1802ms。 | 原稿概括为约 50ms，截图后续值为 44～79ms。 | 本地 Redis 访问开销较高，不能直接当作 PT 或 PRD 指标。 |
| 配置查询，PT | 原稿估算约 180～340ms，日志也存在区间外的值。 | 多数请求降至个位数 ms，仍可见十几或几十 ms 的记录。 | 比较的是 `query` 阶段。 |
| 商品实例化，PT | 冷缓存下数百至上千 ms；300 秒内复用同一商品时较快。 | 延长缓存后，原稿记录 10 分钟持续轮询时耗时较低且更稳定。 | 比较的是 `IMarketComponentService#goodInstantiation`。 |
| 商品拆分接口，PT | 原稿汇总平均约 800ms，商品间差异较大。 | 原稿汇总平均约 150ms。 | 比较的是拆分接口日志 `getSplitGoods.getSplitGoods_end cost`，属于完整出单链路中的一个阶段。 |

按原稿近似平均值计算，商品拆分接口耗时下降约 **81%**：`(800 - 150) / 800`。原稿未给出完整样本量、并发参数和 P95/P99，截图中优化后也仍有数百 ms 的请求，因此该结果不能表述为每次请求都稳定在 150ms 或完整出单耗时下降 81%。

### 第一阶段：商品配置查询缓存

本地验证中，首次访问仍然回源，耗时 1802ms；后续读取缓存时，截图记录了 79、50、45、44、45、46ms。

![本地配置缓存验证，首次加载与后续命中耗时对比](/reports/policy-issuance-performance/query-cache-local-validation.png)

原稿记录本地 Redis 单次操作约 50ms、PT 约 5～10ms，并预计 PRD 更快。这些是不同环境下的描述，不能混合作为同一组优化前后数据，PRD 结果仍需实际测量。

PT 验证对 PayPay 商品轮询出单，检索日志中的 `query 耗时`。优化后的截图可见大量个位数耗时。

<details>
<summary>查看 PT 配置查询优化前日志（3 张）</summary>

![PT 配置查询优化前日志，第 1 张](/reports/policy-issuance-performance/query-before-1.png)

![PT 配置查询优化前日志，第 2 张](/reports/policy-issuance-performance/query-before-2.png)

![PT 配置查询优化前日志，第 3 张](/reports/policy-issuance-performance/query-before-3.png)

</details>

<details>
<summary>查看 PT 配置查询增加缓存后日志（3 张）</summary>

![PT 配置查询增加缓存后日志，第 1 张](/reports/policy-issuance-performance/query-after-1.png)

![PT 配置查询增加缓存后日志，第 2 张](/reports/policy-issuance-performance/query-after-2.png)

![PT 配置查询增加缓存后日志，第 3 张](/reports/policy-issuance-performance/query-after-3.png)

</details>

### 第二阶段：延长商品实例化缓存

原缓存只有 300 秒有效期：冷缓存请求耗时较高，同一商品在有效期内再次出单则较快。延长到当日结束后，原稿记录了 **10 分钟不间断轮询**，耗时保持在较低水平。

该验证跨过原来的 300 秒有效期，支持延长缓存可以减少这一时间范围内的重复回源。它尚未覆盖跨日集中失效或运行更长时间后的情况。

<details>
<summary>查看 PT 商品实例化延长缓存前日志（2 张）</summary>

![PT 商品实例化延长缓存前日志，第 1 张](/reports/policy-issuance-performance/instantiation-before-1.png)

![PT 商品实例化延长缓存前日志，第 2 张](/reports/policy-issuance-performance/instantiation-before-2.png)

</details>

<details>
<summary>查看 PT 商品实例化延长缓存后日志（2 张）</summary>

![PT 商品实例化延长缓存后日志，第 1 张](/reports/policy-issuance-performance/instantiation-after-1.png)

![PT 商品实例化延长缓存后日志，第 2 张](/reports/policy-issuance-performance/instantiation-after-2.png)

</details>

### 商品拆分接口整体观察

两阶段改动完成后，原稿汇总商品拆分接口平均耗时由约 800ms 降至约 150ms，连续高耗时波峰有所减少。截图中的单次耗时仍有差异，后续应使用完整分布评估长尾。

<details>
<summary>查看 PT 商品拆分接口优化前日志（3 张）</summary>

![PT 商品拆分接口优化前日志，第 1 张](/reports/policy-issuance-performance/split-before-1.png)

![PT 商品拆分接口优化前日志，第 2 张](/reports/policy-issuance-performance/split-before-2.png)

![PT 商品拆分接口优化前日志，第 3 张](/reports/policy-issuance-performance/split-before-3.png)

</details>

<details>
<summary>查看 PT 商品拆分接口两阶段优化后日志（4 张）</summary>

![PT 商品拆分接口两阶段优化后日志，第 1 张](/reports/policy-issuance-performance/split-after-1.png)

![PT 商品拆分接口两阶段优化后日志，第 2 张](/reports/policy-issuance-performance/split-after-2.png)

![PT 商品拆分接口两阶段优化后日志，第 3 张](/reports/policy-issuance-performance/split-after-3.png)

![PT 商品拆分接口两阶段优化后日志，第 4 张](/reports/policy-issuance-performance/split-after-4.png)

</details>

原稿还记录：缓存版本发布到测试环境后，使用 Magic 脚本批量出单时，未再观察到此前 CPU、内存快速增长并导致 Market 崩溃重启的现象。材料没有给出该轮测试的请求量、并发、资源曲线和完整持续时间，因此将其保留为测试观察，不能据此认定所有资源问题都已解决。

## 后续完善与验证建议

以下是基于此次调查的建议，原稿未记录它们已全部实施。

| 方向 | 需要解决或验证的问题 |
| --- | --- |
| 缓存键覆盖查询维度 | 商品、渠道、计划、业务日期等会影响查询结果，应按实际入参设计缓存键，避免不同请求错误复用配置。 |
| 配置变更及时生效 | 当日结束 TTL 不能代替更新失效；发布新配置时应同步失效或切换版本，避免当天继续读取旧配置。 |
| 静态配置与动态计算 | 优先缓存可复用的配置；若缓存计算结果，还需覆盖影响试算的动态输入，保证结果一致性。 |
| 失效后的集中回源 | 验证业务时区下的跨日失效、多实例同时加载和高并发冷启动，按需要增加预热与同键回源合并。 |
| 查询本身的优化 | 核查险种循环中的重复 SQL，评估批量查询；示例中的 `package_liability_ext` 查询未按产品过滤，尤其值得检查是否可复用同一结果。 |
| 缓存异常与容量 | 覆盖 Redis 超时、不可用、数据淘汰、序列化兼容和缓存容量，观察回源后的数据库压力。 |
| 性能与业务正确性回归 | 同条件比较冷、热缓存下的出单总耗时、阶段耗时、P95/P99、SQL 次数、命中率、CPU/内存；同时核对保费、责任和约定结果一致性。 |

## 实践经验

- **先用业务日志拆分耗时，再跟踪关键方法。** 整体出单慢可能包含数据库、计算或外部调用，应先找到占时较多的阶段。
- **同时关注 SQL 次数和单条 SQL 耗时。** 单条查询只需几毫秒，大量串行往返仍会累积成明显延迟；商品和险种数量是重要的分组维度。
- **分别验证冷缓存、热缓存和失效后的请求。** 仅重复访问同一商品，容易遗漏缓存周期性失效导致的波峰。
- **把增强观测和性能基准区分开。** Arthas trace 用于定位调用路径，实际性能对比应统一环境、请求集、并发及观测方式。
- **给延长缓存配套更新机制。** 配置复用能减少数据库压力，正确失效则保证新配置及时生效。

Arthas 启动及常用命令可参考本站 [常用中间件指令](./middleware-commands.md)。

## 附录：原稿中的 SQL 示例

以下保留原稿的表名和示例参数，统一格式与 SQL 高亮。不同 SQL 中的商品 ID、渠道码来自不同记录，业务日期示例为 `2025-04-23`，用于说明查询形态，不能直接拼成同一请求的完整执行序列。SQL 次数还受循环次数和条件分支影响。

<details>
<summary>queryGoodsBasic：商品基础与渠道配置，原稿记录 9 次及以上 SQL</summary>

商品渠道扩展：

```sql
SELECT *
FROM sj_gr_market.goods_ext
WHERE goods_id = 1522014
  AND channel_code = 'L9282200'
  AND is_deleted = 'N';
```

指定计划及计划渠道扩展：

```sql
SELECT *
FROM sj_gr_market.goods_plan
WHERE id = 1510981
  AND is_deleted = 'N';

SELECT *
FROM sj_gr_market.goods_plan_ext
WHERE goods_plan_id = 1510981
  AND channel_code = 'L9282100'
  AND is_deleted = 'N';
```

分页查询商品，包含计数和数据查询：

```sql
SELECT COUNT(1)
FROM sj_gr_market.goods a
WHERE a.id = 1522010
  AND a.is_deleted = 'N';

SELECT *
FROM sj_gr_market.goods a
WHERE a.id = 1522010
  AND a.is_deleted = 'N'
LIMIT 0, 1000;
```

商品渠道扩展：

```sql
SELECT *
FROM sj_gr_market.goods_ext
WHERE is_deleted = 'N'
  AND channel_code = 'L9282100'
  AND goods_id IN (1522010)
ORDER BY id;
```

按商品循环查询团体约定和商品渠道：

```sql
SELECT *
FROM sj_gr_market.goods_group_agreement
WHERE goods_id = 1522010
  AND start_date <= '2025-04-23 00:00:00.0'
  AND end_date >= '2025-04-23 00:00:00.0'
  AND is_deleted = 'N';

SELECT *
FROM sj_gr_market.goods_channel
WHERE goods_id = 1522010
  AND is_deleted = 'N';
```

存在团体约定时，额外查询设置：

```sql
SELECT *
FROM sj_gr_market.goods_group_agreement_extra_setting
WHERE goods_agreement_no = 1522010
  AND is_deleted = 'N';
```

</details>

<details>
<summary>queryGoodsPlan：2 次 SQL</summary>

查询商品计划及渠道扩展：

```sql
SELECT *
FROM sj_gr_market.goods_plan
WHERE is_deleted = 'N'
  AND goods_id = 1522010
  AND id IN (1510981);

SELECT *
FROM sj_gr_market.goods_plan_ext
WHERE is_deleted = 'N'
  AND channel_code = 'L9282100'
  AND goods_plan_id IN (1510981)
ORDER BY id;
```

</details>

<details>
<summary>queryGoodsPlanAgreement：1 次 SQL</summary>

查询计划特约：

```sql
SELECT *
FROM sj_gr_market.goods_plan_agreement
WHERE goods_plan_id = 1510981
  AND is_deleted = 'N';
```

</details>

<details>
<summary>queryGoodsPlanService：1 次 SQL</summary>

查询计划配置的服务信息：

```sql
SELECT *
FROM sj_gr_market.goods_plan_service
WHERE goods_plan_id = 1510981
  AND is_deleted = 'N';
```

</details>

<details>
<summary>queryGoodsPackage：原稿记录 5～21 次 SQL</summary>

查询商品组合、组合下的产品和渠道扩展：

```sql
SELECT *
FROM sj_gr_market.package
WHERE id = 1516944
  AND is_deleted = 'N';

SELECT *
FROM sj_gr_market.package_product
WHERE package_id = 1516944
  AND is_deleted = 'N'
ORDER BY product_type;

SELECT *
FROM sj_gr_market.package_product_ext
WHERE is_deleted = 'N'
  AND channel_code = 'L9282100'
  AND package_id IN (1516944)
ORDER BY id;
```

按险种循环查询责任及扩展，原稿记录这两类查询各执行 1～9 次：

```sql
SELECT *
FROM sj_gr_market.package_liability
WHERE package_id = 1516944
  AND product_id = 1512878
  AND liability_type = 1
  AND is_deleted = 'N';

SELECT *
FROM sj_gr_market.package_liability_ext
WHERE is_deleted = 'N'
  AND channel_code = 'L9282100'
  AND package_id IN (1516944)
ORDER BY id;
```

</details>
