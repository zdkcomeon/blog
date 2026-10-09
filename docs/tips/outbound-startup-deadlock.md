---
title: 调查报告：Dev2 环境 EKS 升级后 Outbound 服务启动异常
description: 结合 jstack 分析 Outbound 启动死锁，确认 Spring 单例注册表锁与 Prometheus 跟踪懒加载锁的反向获取，说明初始化时序及两种修复方案。
date: 2026-10-09
category:
  - 实践笔记
tag:
  - Kubernetes
  - EKS
  - Spring Boot
  - Spring
  - 并发
  - 故障排查
---

2025 年 7 月 23 日，Dev2 环境完成 EKS 升级后，Outbound 服务在启动阶段调用第三方接口加载数据，随后持续阻塞，没有明确的错误日志。

补充的 `jstack` 日志直接确认了 **Spring 单例注册表锁与 Prometheus 跟踪依赖懒加载锁之间的死锁**：主线程初始化 Address 组件、i18n 定时线程加载数据，两条 HTTP 调用路径在监控收尾阶段以相反顺序获取这两把锁。

Bean 初始化顺序变化使这两条路径在启动阶段重叠。历史镜像能够在升级后的 Dev2 环境正常运行，而重新构建的镜像在 Dev1、Dev2 均可出现异常，因此需要区分“故障发生在 EKS 升级之后”和“EKS 升级直接导致故障”。

本文结合原始调查记录与补充线程栈，保留现场截图、原始死锁日志及进一步分析的链接。两种修复方案的最终选择、实施时间及修复验证结果仍未记录。

## 事件概述

| 项目 | 记录 |
| --- | --- |
| 事件日期 | 2025-07-23 |
| 环境与背景 | Dev2 环境完成 EKS 升级，随后部署服务 |
| 受影响服务 | Outbound |
| 故障阶段 | 启动初始化期间，调用第三方接口加载数据 |
| 主要现象 | 日志停留在数据加载附近，启动流程不再推进，无明确异常日志 |
| 已确认的运行时版本 | JDK 17.0.6，来自线程栈中的 `java.base@17.0.6` |
| 调查结果 | JVM 检出 Java 级死锁，涉及 `main` 与 `i18n-scheduled-guava-cache-`；本次横向审查仅发现 Outbound 存在同类问题 |

### 现场现象

服务并非通过异常堆栈显式退出，而是在初始化过程中持续等待。现场日志停留在第三方数据加载调用附近：

![Outbound 启动日志：初始化期间发起第三方数据加载请求后，日志不再推进](./assets/outbound-startup-deadlock/startup-hang.jpeg)

截图能帮助定位最后可见的执行阶段，但仅凭日志停顿不能证明第三方接口本身故障。需要结合线程栈，确认请求、回调和组件初始化各自等待什么。

## 调查过程与证据

### 1. 检查系统资源

CPU 和内存使用率均在正常范围内。增加 CPU 分配、Pod 内存配置及 JVM 内存设置后，故障仍然存在。

这些结果未支持资源不足这一排查方向。继续扩容无法解除线程之间的循环等待，因此调查转向构建产物和启动过程。

### 2. 对比环境与镜像

| 对比场景 | 结果 | 对排查的意义 |
| --- | --- | --- |
| Dev1 环境使用历史镜像 | 正常运行 | 历史产物可以完成启动 |
| 将 Dev1 可用镜像部署到 Dev2 | 正常运行 | 升级后的 Dev2 并非无法运行所有 Outbound 镜像 |
| Dev2 环境使用新构建镜像 | 持续启动失败 | 异常与新产物或其初始化行为相关 |
| 在 Dev1 修改代码并重新构建 | 同样出现启动失败 | 问题可以在 Dev2 之外出现，需要继续检查构建与初始化差异 |

这组结果把排查重点从环境资源转向了**新旧产物差异，以及这些差异是否改变 Bean 初始化顺序**。EKS 升级是事件背景，现有证据不足以单独将其认定为直接根因。

### 3. 对比 JAR 包与初始化顺序

初步比较两环境生成的 JAR 包，没有发现明显差异，但 MD5 校验值不一致。SRE 提出可能存在依赖项变更，需要进一步核对。

随后观察到：同一分支、相同代码构建出的 JAR 包，运行时的 Bean 加载顺序并不一致。这是继续追踪启动行为的重要线索。

需要区分两类结论：

- **已观察到的差异**：产物校验值不同，Bean 初始化顺序不同。
- **尚未证实的原因**：构建环境或依赖解析发生变化。MD5 不一致只能证明文件内容不同；打包时间戳、元数据等也可能造成差异，不能仅凭校验值确认依赖版本变更。

补充线程栈确认运行时为 JDK 17.0.6，但 EKS、Spring Boot、Spring Framework、Micrometer、Prometheus 客户端及构建工具的具体版本仍未记录，也没有完整依赖差异清单。因此，导致初始化顺序变化的具体构建因素仍需补充证据。

### 4. 分析运行时线程

最初使用 Arthas 分析发现线程阻塞；后续 `jstack` 明确输出 `Found one Java-level deadlock`，给出了两条参与线程的持锁与等待关系。这使死锁判断从排查方向变成了有 JVM 日志支持的结论。

补充材料中的 JVM 死锁摘要和两个参与线程的完整栈已保留为 [原始 jstack 死锁段（TXT）](/blog/reports/outbound-startup-deadlock/thread-dump.txt)。下文摘录关键帧，便于对应业务调用与锁对象。

详细记录见 [Outbound 启动死锁问题调查](https://zatech.sg.larksuite.com/docx/LX5udMpgyoQjOjx9O8UlRxivg4b)。该链接为原始调查文档，访问需要相应权限。

## 根因分析

### 初始化顺序变化扩大了并发触发窗口

原始调查记录了以下顺序变化：

| 场景 | 初始化顺序 | 结果 |
| --- | --- | --- |
| 历史可用场景 | Address 组件先于 i18n 组件初始化 | 未出现本次锁等待闭环，服务正常启动 |
| 故障场景 | i18n 组件先于 Address 组件初始化 | i18n 定时任务与 Address 的初始化调用重叠，触发锁等待闭环 |

补充分析还记录了“本地后加载 i18n、线上先加载 i18n”的对比。初始化顺序是触发条件的线索，直接的死锁证据则是下面的两个锁对象及其持有者。

### jstack 直接确认两把锁的反向获取

JVM 输出的死锁摘要如下，线程名、锁类型与对象地址均保留自补充日志：

```text
Found one Java-level deadlock:
=============================
"main":
  waiting for ownable synchronizer 0x00000000baab8188, (a java.util.concurrent.locks.ReentrantLock$NonfairSync),
  which is held by "i18n-scheduled-guava-cache-"

"i18n-scheduled-guava-cache-":
  waiting to lock monitor 0x00007f3204124060 (object 0x00000000c188b858, a java.util.concurrent.ConcurrentHashMap),
  which is held by "main"
```

| 锁 | 现场对象地址 | 用途与定位依据 | 持有线程 | 等待线程 |
| --- | --- | --- | --- | --- |
| A：Spring 单例注册表监视器 | `0x00000000c188b858` | 对象类型为 `ConcurrentHashMap`；主线程在 `DefaultSingletonBeanRegistry.getSingleton()` 中持有它 | `main` | `i18n-scheduled-guava-cache-` |
| B：懒加载供应器的显式锁 | `0x00000000baab8188` | 类型为 `ReentrantLock$NonfairSync`；主线程在 `SingletonSupplier.get()` 中等待它 | `i18n-scheduled-guava-cache-` | `main` |

锁 A 的对象类型是 `ConcurrentHashMap`，这里关注的是 Spring 在单例管理路径中使用该对象的监视器，并非 Map 的普通读写操作本身发生了死锁。锁 B 保护 `SingletonSupplier` 的懒加载取值，也不能简单等同于“Prometheus 单例 Bean 本身的锁”。

### 主线程：持有容器锁，等待懒加载锁

`main` 正在创建 Bean，执行 `AddressAndAreaInitConfig.afterPropertiesSet()`，并通过 Feign 调用 `batchQueryListResData()`。调用进入观测收尾阶段后，Micrometer 记录 Timer，Prometheus 的 `ExemplarSampler` 尝试获取当前 Span 信息，最终等待 `SingletonSupplier` 的锁 B。

下面按原始栈的方向摘录关键帧，省略中间调用：

```text
"main":
    at java.util.concurrent.locks.ReentrantLock.lock(ReentrantLock.java:322)
    at org.springframework.util.function.SingletonSupplier.get(SingletonSupplier.java:101)
    at org.springframework.util.function.SingletonSupplier.obtain(SingletonSupplier.java:127)
    at org.springframework.boot.actuate.autoconfigure.tracing.prometheus.PrometheusExemplarsAutoConfiguration$LazyTracingSpanContext.currentSpan(PrometheusExemplarsAutoConfiguration.java:93)
    ...
    at io.prometheus.metrics.core.exemplars.ExemplarSampler.doSampleExemplar(ExemplarSampler.java:330)
    ...
    at io.micrometer.prometheusmetrics.PrometheusTimer.recordNonNegative(PrometheusTimer.java:88)
    ...
    at feign.micrometer.MicrometerObservationCapability.finalizeObservation(MicrometerObservationCapability.java:93)
    ...
    at jdk.proxy2.$Proxy166.batchQueryListResData(jdk.proxy2/Unknown Source)
    at com.zhongan.graphene.outbound.scenario.service.thirdparty.support.config.AddressAndAreaInitConfig.afterPropertiesSet(AddressAndAreaInitConfig.java:71)
    ...
    at org.springframework.beans.factory.support.DefaultSingletonBeanRegistry.getSingleton(DefaultSingletonBeanRegistry.java:234)
    - locked <0x00000000c188b858> (a java.util.concurrent.ConcurrentHashMap)
```

此时主线程尚未完成 Bean 初始化，仍持有锁 A。它等待的具体对象是监控路径中的懒加载锁 B，线程栈没有显示它在等待 i18n 业务任务的 Future 返回。

### i18n 定时线程：持有懒加载锁，等待容器锁

`i18n-scheduled-guava-cache-` 由定时线程池执行缓存任务，经 `I18nAccessor.queryConditionByLatelyDelete()` 发起 RestTemplate 调用。它同样在 `Observation.stop()` 路径上触发 Timer 记录与 Exemplar 采样。

该线程先进入 `SingletonSupplier.get()`，持有锁 B，再通过 `ObjectProvider` 解析跟踪依赖。解析过程中，Spring 查找候选 Bean、检查 FactoryBean 类型，需要获取锁 A，于是被主线程阻塞。

```text
"i18n-scheduled-guava-cache-":
    at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.getSingletonFactoryBeanForTypeCheck(AbstractAutowireCapableBeanFactory.java:993)
    - waiting to lock <0x00000000c188b858> (a java.util.concurrent.ConcurrentHashMap)
    ...
    at org.springframework.beans.factory.support.DefaultListableBeanFactory.findAutowireCandidates(DefaultListableBeanFactory.java:1637)
    at org.springframework.beans.factory.support.DefaultListableBeanFactory.doResolveDependency(DefaultListableBeanFactory.java:1397)
    at org.springframework.beans.factory.support.DefaultListableBeanFactory$DependencyObjectProvider.getObject(DefaultListableBeanFactory.java:2070)
    ...
    at org.springframework.util.function.SingletonSupplier.get(SingletonSupplier.java:106)
    at org.springframework.util.function.SingletonSupplier.obtain(SingletonSupplier.java:127)
    at org.springframework.boot.actuate.autoconfigure.tracing.prometheus.PrometheusExemplarsAutoConfiguration$LazyTracingSpanContext.currentSpan(PrometheusExemplarsAutoConfiguration.java:93)
    ...
    at io.prometheus.metrics.core.exemplars.ExemplarSampler.doSampleExemplar(ExemplarSampler.java:330)
    ...
    at org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:907)
    ...
    at com.zatech.octopus.component.i18n.lang.support.I18nAccessor.queryConditionByLatelyDelete(I18nAccessor.java:91)
    at com.zatech.octopus.component.i18n.lang.support.I18nCacheMessageHandler.lambda$init$4(I18nCacheMessageHandler.java:66)
    ...
    at java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:305)
```

栈中显示的是依赖解析与类型检查过程的锁等待；补充文字中的“注册 Prometheus 对象失败”应据此收窄为“解析跟踪依赖时等待容器锁”，没有对应的注册失败异常。

### 等待闭环与故障结论

两条调用路径通过共享的监控组件形成耦合，锁关系可以直接对应到现场地址：

```text
main
  持有 A：Spring 单例注册表监视器（0x00000000c188b858）
  等待 B：SingletonSupplier 懒加载锁（0x00000000baab8188）
                 │ B 由 i18n 线程持有
                 ▼
i18n-scheduled-guava-cache-
  持有 B：SingletonSupplier 懒加载锁（0x00000000baab8188）
  等待 A：Spring 单例注册表监视器（0x00000000c188b858）
                 │ A 由 main 持有，形成闭环
                 └──────────────────────────────→ main
```

因此，已确认的直接原因是：**Bean 初始化与 i18n 定时任务并发执行，两条 HTTP 观测路径在跟踪依赖懒加载时，以 A → B 和 B → A 的相反顺序获取锁。** 初始化顺序变化影响了这个触发窗口，而非证明 Address 与 i18n 存在直接的业务数据依赖。

这里的 Feign 与 RestTemplate 请求本身均为同步调用，跨线程并发来自 i18n 定时任务。因此，方案 2 中的同步化需要落实到初始化任务的执行时序，而不是仅改变 HTTP 客户端的调用方式。

两个线程均停在观测收尾调用链中。`Observation.stop()` 并不能单独证明第三方请求成功，也不能据此判断第三方接口是故障源；需要结合请求响应记录判断业务调用结果。

死锁也不会必然产生异常日志：线程持续等待已有锁，既没有继续推进，也没有抛出异常，因此表现为“进程仍在，启动日志停住”。修复应解除这组锁等待闭环，并控制初始化阶段的并发时机。

## 现场排查与复现要点

补充材料使用 `jps` 定位 Java 进程，再用 `jstack` 查看线程信息。可按以下方式保留包含锁信息的输出，将示例 PID 替换为实际 Outbound 进程号：

```bash
jps -l
OUTBOUND_PID=12345
jstack -l "$OUTBOUND_PID" > outbound-thread-dump.txt
```

也可使用 `jcmd "$OUTBOUND_PID" Thread.print -l` 获取线程信息。命令需在能够访问目标 JVM 且具备 Attach 权限的环境中执行。

排查时按以下顺序核对：

1. 查找 `Found one Java-level deadlock`，用同一次线程转储中的对象地址匹配持有者和等待者。对象地址用于现场关联，不作为跨进程或跨次启动的固定标识。
2. 对应业务入口：主线程的 `AddressAndAreaInitConfig.afterPropertiesSet()` 与 i18n 定时任务的 `I18nCacheMessageHandler.lambda$init$4()`。
3. 对应共享路径：Feign／RestTemplate → Micrometer 观测收尾 → Prometheus Exemplar 采样 → `LazyTracingSpanContext` → `SingletonSupplier`。
4. 在新进程中复现冷启动，记录 Bean 初始化顺序、定时任务首次执行时间及跟踪依赖首次解析时机。已有进程中依赖完成初始化后的调用，不能覆盖同一风险窗口。
5. 补齐实际依赖版本、镜像和构建差异，以解释为何新产物改变了初始化顺序。

## 横向排查与影响范围

团队对其他服务进行了同类风险审查，详细记录见 [Outbound 死锁原因问题横展开](https://zatech.sg.larksuite.com/docx/HFDwd0hW6ovtljxVjSZlkTCBgXd)。访问该原始文档需要相应权限。

本次调查仅确认 Outbound 存在此问题。其他服务在初始化过程中，要么不与第三方服务交互，要么采用同步交互方式，没有发现相同的异步等待闭环。

这个结论限定于本次审查范围。本次主线程的 Feign 调用本身也是同步执行，仍参与了锁等待闭环；审查应覆盖后台任务的启动时机、监控懒加载和锁获取顺序，同时检查超时边界。

## 修复方案与实施建议

### 方案 1：定向调整 Outbound

仅修改受影响的 Outbound 服务，使用 `ApplicationListener` 监听合适的生命周期事件，将相关数据加载移出 Bean 初始化阶段，延后至所需组件完成初始化后执行。

结合线程栈，该方案需要移走的具体入口是 `AddressAndAreaInitConfig.afterPropertiesSet()` 中的 Feign 调用。这样可避免主线程持有单例注册表锁 A 时，再通过请求观测收尾争用懒加载锁 B。

实施时需要同时满足以下条件：

- 移除或调整原初始化路径中的提前加载，避免服务在到达监听事件之前仍被阻塞。
- 根据依赖选择具体事件。`ApplicationListener` 是监听机制，本身并不代表资源已经就绪；例如 `ContextRefreshedEvent` 表示容器刷新完成，`ApplicationReadyEvent` 则发生在更晚的启动阶段。
- 限定监听的目标应用上下文，过滤其他上下文的刷新事件，并让加载逻辑具备幂等性，防止提前触发或重复加载。
- 如果数据加载是对外服务的前提，应将加载结果纳入就绪判断，并为第三方调用配置超时和失败处理。

该方案变更范围小，适合优先评估用于本次 Outbound 故障处置，但仍需用实际启动验证确认等待闭环已解除。

### 方案 2：调整 i18n 基础包

修改基础包中的 i18n 初始化流程，将初始化阶段必要的数据获取改为同步执行，并控制 `i18n-scheduled-guava-cache-` 定时任务的首次执行时机。在相关依赖可用、必要初始化完成后，再进入后续并发处理。

同步化应覆盖实际引发并发的初始化路径，并同时核对定时任务启动时机。该方案的验证目标是：主线程持有锁 A 创建 Bean 时，后台任务不会先持有锁 B 再回到 Spring 容器解析依赖。

该方案需要先梳理同步调用的依赖关系，确保没有保留循环依赖；同时评估第三方调用超时、失败传播及启动耗时。修改会影响所有使用该基础包的项目，需要进行跨服务回归验证。

### 方案对比与决策状态

| 维度 | 方案 1：调整 Outbound | 方案 2：调整 i18n 基础包 |
| --- | --- | --- |
| 修改位置 | Outbound 的数据加载生命周期 | 共享基础包的初始化流程 |
| 核心方式 | 将 Address 的 Feign 调用移出持有容器锁的 Bean 初始化阶段 | 控制 i18n 初始化并发与定时任务首次执行时机 |
| 影响范围 | 当前受影响服务 | 所有使用该基础包的项目 |
| 验证重点 | 事件时机、重复执行、启动与就绪状态 | 依赖关系、启动耗时、兼容性与跨服务回归 |
| 实施建议 | 优先评估，控制本次修复范围 | 作为基础包改进评估，安排统一验证与发布 |

**决策状态：原稿未记录最终采用哪一种方案，也未记录修复已上线或验证通过。** 上述优先级属于本文的实施建议，不能作为已完成处置的结论。

## 修复验收与待补记录

实施后应验证以下结果，再补充最终处置记录：

1. 使用新构建的镜像在 Dev1、Dev2 进行多次冷启动，覆盖原先触发问题的初始化顺序。
2. 确认启动流程完成，`jstack -l` 不再报告上述 Java 级死锁，线程分析中不再出现容器锁与懒加载锁的等待闭环，相关数据已加载且业务接口可用。
3. 模拟第三方接口超时或返回错误，确认服务能按预期失败或降级，日志能定位具体阶段。
4. 核对就绪探针与数据加载状态，避免在必要数据尚未可用时接收业务流量。
5. 若修改基础包，补充所有使用方的回归结果、启动耗时对比及回滚版本。

最终记录还应包含：实际选用的方案、代码提交与镜像版本、实施时间，以及导致 Bean 初始化顺序变化的构建或依赖证据。

## 参考记录

- [Outbound 启动死锁问题调查](https://zatech.sg.larksuite.com/docx/LX5udMpgyoQjOjx9O8UlRxivg4b)
- [Outbound 死锁原因问题横展开](https://zatech.sg.larksuite.com/docx/HFDwd0hW6ovtljxVjSZlkTCBgXd)
- [补充材料：原始 jstack 死锁段（TXT）](/blog/reports/outbound-startup-deadlock/thread-dump.txt)
- 本文现场截图来自原始调查记录，保存在文章本地资源目录中。
