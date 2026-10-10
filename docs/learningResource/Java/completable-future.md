---
title: CompletableFuture 异步编排
description: 整理任务提交、执行线程、回调、异常传播、任务组合与等待机制。
date: 2026-06-29
category:
- 学习资源
tag:
- Java
- 并发
- CompletableFuture
- 知识梳理
---

整理任务提交、执行线程、回调、异常传播、任务组合与等待机制。执行器的创建、队列和关闭方式见 [Java 线程池与任务执行](./thread-pools.md)。

## CompletableFuture 与 Future

`Future` 表示异步任务的结果，可以查询完成状态、等待结果和请求取消。`get()` 会在结果未完成时阻塞，单次 `isDone()` 查询不会阻塞，但反复轮询可能浪费处理器时间。

`CompletableFuture` 同时实现 `Future` 和 `CompletionStage`，可以在完成后继续转换结果、处理异常或组合后续任务，从而减少手动等待和轮询代码。

它不会自动让全部代码并行执行。依赖关系、提交方式、执行器容量以及是否调用阻塞等待方法，都会影响实际执行过程。

## 创建与提交任务

| 方法 | 任务类型 | 结果类型 |
| --- | --- | --- |
| `runAsync(Runnable)` | 不返回业务结果 | `CompletableFuture<Void>` |
| `supplyAsync(Supplier<T>)` | 返回业务结果 | `CompletableFuture<T>` |
| `completedFuture(value)` | 创建已经正常完成的阶段 | `CompletableFuture<T>` |
| `new CompletableFuture<>()` | 创建尚未完成的结果容器 | 通过 `complete()` 或 `completeExceptionally()` 完成 |

`runAsync()` 和 `supplyAsync()` 都可以显式传入 `Executor`：

```java
ExecutorService executor = Executors.newFixedThreadPool(4);
try {
    CompletableFuture<Integer> result = CompletableFuture
            .supplyAsync(() -> 10, executor)
            .thenApplyAsync(value -> value * 2, executor);
    int value = result.join(); // 20
} finally {
    executor.shutdown();
}
```

应用中的共享线程池通常由统一的生命周期管理逻辑关闭，不应在每个请求结束时关闭。这里使用局部线程池，便于展示完整的创建与释放过程。

## 回调由哪个线程执行

### 不带 Async 的方法

`thenApply()`、`thenAccept()`、`whenComplete()` 等不带 `Async` 的方法，不主动要求把回调提交给另一个执行器。回调可能由完成前一阶段的线程执行；如果注册时前一阶段已经完成，也可能由注册回调的当前线程执行。

因此，不能把它们概括为始终由主线程执行，或始终由异步任务线程执行。回调所在的线程也不能通过任务运行得快慢来可靠推断。

### 带 Async 的方法

未显式指定执行器的异步方法，通常使用默认的 `ForkJoinPool.commonPool()`。当公共池不支持至少两个并行线程时，`CompletableFuture` 的默认策略会为任务创建新线程。

传入 `Executor` 的重载使用该执行器调度相应阶段。前一阶段指定过自定义线程池，不代表后续未指定执行器的 `thenApplyAsync()` 等方法会自动继承它。

`Async` 表达调度方式，不保证一定切换到另一条线程。例如，执行器可以在调用线程中执行任务，线程池的 `CallerRunsPolicy` 也可能让提交线程执行任务。长时间阻塞的工作应根据容量需求选择执行器。具体策略见 [CompletableFuture 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CompletableFuture.html)。

## 依赖任务的转换与消费

以下方法默认在前一阶段正常完成后执行；前一阶段异常完成时，通常跳过正常结果回调并向后传播异常。

| 方法 | 接收前一阶段结果 | 回调返回值 | 返回阶段类型 |
| --- | --- | --- | --- |
| `thenApply(fn)` | 是 | 新的普通值 | `CompletableFuture<U>` |
| `thenAccept(action)` | 是 | 无 | `CompletableFuture<Void>` |
| `thenRun(action)` | 否 | 无 | `CompletableFuture<Void>` |
| `thenCompose(fn)` | 是 | 另一个 `CompletionStage<U>` | 展平后的 `CompletableFuture<U>` |

这些方法都有相应的 `Async` 重载。是否带 `Async` 影响执行调度，不改变转换、消费或依赖关系。

`thenRun()` 不接收前一步结果，但仍然依赖前一步正常完成。不能将其描述为与上一步任务无关。

### thenApply() 与 thenCompose()

如果回调本身返回异步阶段，使用 `thenApply()` 会得到嵌套结果：

```java
CompletableFuture<CompletableFuture<Integer>> nested = CompletableFuture
        .completedFuture(10)
        .thenApply(value -> CompletableFuture.completedFuture(value * 2));
```

使用 `thenCompose()` 则把下一阶段连接进来，得到直接表示最终结果的 Future：

```java
CompletableFuture<Integer> flattened = CompletableFuture
        .completedFuture(10)
        .thenCompose(value -> CompletableFuture.completedFuture(value * 2));
int result = flattened.join(); // 20
```

需要串联两个存在依赖的异步操作时，通常使用 `thenCompose()`；增加 `thenApplyAsync()` 只会改变回调调度，不会自动展平嵌套的 Future。

## 多个任务的组合

### thenCombine()：合并两个正常结果

两个独立任务分别提交后，可以用 `thenCombine()` 等待两者正常完成并合并结果：

```java
ExecutorService executor = Executors.newFixedThreadPool(2);
try {
    CompletableFuture<Integer> first = CompletableFuture.supplyAsync(() -> 10, executor);
    CompletableFuture<Integer> second = CompletableFuture.supplyAsync(() -> 20, executor);
    CompletableFuture<Integer> combined = first.thenCombine(second, Integer::sum);
    int result = combined.join(); // 30
} finally {
    executor.shutdown();
}
```

两个任务的并发执行来自分别提交任务，`thenCombine()` 负责组合结果。如果其中一个异常完成，正常的合并函数不会按两个成功值执行。

### allOf()：等待全部完成

```java
CompletableFuture<Void> all = CompletableFuture.allOf(first, second);
all.join();
int result = first.join() + second.join();
```

`allOf()` 返回的阶段在所有输入阶段完成后结束，返回类型为 `Void`，不直接收集各任务结果。若任一输入阶段异常完成，组合阶段也会异常完成，此时 `join()` 会抛出异常。

`allOf()` 不负责启动任务，也不保证输入任务并行执行。输入任务应当已由相应提交或完成机制驱动。示例中的 `first`、`second` 可使用上一节创建的两个 Future。

### anyOf()：等待最先完成的一个

`anyOf(first, second)` 返回 `CompletableFuture<Object>`，由最先完成的输入阶段决定其结果。这个完成可以是正常完成，也可以是异常完成。

所以 `anyOf()` 不能实现等待第一个成功结果的可靠策略。它也不会自动取消其余任务。

### applyToEither()：处理任一阶段的结果

`first.applyToEither(second, fn)` 用于组合两个相同结果类型的阶段，在满足正常完成条件时应用结果转换。无返回值的对应方法是 `acceptEither()` 和 `runAfterEither()`。

当一个阶段异常完成时，不能把 `applyToEither()` 当作保证忽略失败、继续等另一个成功的机制。需要第一个成功结果的语义时，应显式协调每个阶段的成功、失败以及全部失败的处理。

原稿中的 `applyEndmatch` 不是 `CompletableFuture` API，这里对应的方法应为 `applyToEither()`。

## 异常处理与传播

### exceptionally()：异常时提供替代结果

`exceptionally()` 只在前一阶段异常完成时执行，回调返回值成为新阶段的正常结果：

```java
CompletableFuture<Integer> failed = new CompletableFuture<>();
failed.completeExceptionally(new IllegalStateException("calculation_failed"));

CompletableFuture<Integer> recovered = failed.exceptionally(error -> -1);
int result = recovered.join(); // -1
```

应明确哪些错误允许返回默认值。把所有错误都转换为默认值，会让调用方无法区分真实结果和降级结果。

### whenComplete()：观察完成情况

`whenComplete()` 在正常或异常完成时都会调用，适合观察结果或执行相应的记录逻辑。它通常保留原阶段的结果或异常，不会因为回调里检查了异常就自动恢复成功状态。

```java
CompletableFuture<Integer> failed = new CompletableFuture<>();
failed.completeExceptionally(new IllegalStateException("calculation_failed"));

CompletableFuture<Integer> observed = failed.whenComplete((value, error) -> {
    // 在此记录完成结果；检查 error 不会把原有失败转换为成功。
});
CompletableFuture<Integer> recovered = observed.exceptionally(error -> -1);
int result = recovered.join(); // -1
```

如果直接对 `observed` 调用 `join()`，仍会抛出 `CompletionException`。此外，观察回调自身抛出异常，也可能让原本正常的阶段转为异常完成。

### handle()：同时转换成功和失败

`handle()` 在正常或异常完成时都执行，并用回调返回值生成新的阶段结果：

```java
CompletableFuture<String> message = future.handle((value, error) -> {
    if (error != null) {
        return "fallback";
    }
    return "result=" + value;
});
```

这里的 `future` 表示需要处理的上游阶段，正确方法名为 `handle()`，不是 `handler()`。

| 方法 | 正常时调用 | 异常时调用 | 可以通过返回值替换结果 |
| --- | --- | --- | --- |
| `exceptionally()` | 否 | 是 | 是，仅异常分支 |
| `whenComplete()` | 是 | 是 | 不提供结果转换返回值 |
| `handle()` | 是 | 是 | 是 |

异常沿依赖链传播，某个正常结果回调被跳过后，后续阶段仍可以通过异常处理方法观察或恢复。恢复为正常结果后，后面的正常结果回调才可以继续执行。

## 等待和获取结果

| 方法 | 未完成时 | 异常完成时 |
| --- | --- | --- |
| `get()` | 阻塞等待，可被中断 | 通常通过受检异常 `ExecutionException` 报告 |
| `get(timeout, unit)` | 等待指定时间，超时抛出 `TimeoutException` | 通常通过 `ExecutionException` 报告 |
| `join()` | 阻塞等待，不以 `InterruptedException` 退出 | 通常抛出运行时异常 `CompletionException` |
| `getNow(defaultValue)` | 立即返回指定默认值 | 仍抛出相应异常，不把失败替换为默认值 |

取消通常通过 `CancellationException` 报告。`get()` 的中断需要正确向上抛出或恢复中断标记，`join()` 没有受检异常也不代表它不会抛出异常。

`get(timeout, unit)` 超时只代表调用方停止本次等待，不会自动终止底层任务。也要避免在容量有限的线程池中，让任务阻塞等待仍排在同一个池队列里的任务，这可能导致线程资源相互等待。

## 取消任务

`CompletableFuture.cancel(true)` 会把该 Future 标记为取消，但其中的 `mayInterruptIfRunning` 参数不用于控制底层处理过程，不能依赖它中断已经运行的计算。

需要实际停止工作时，应根据所用任务和执行器设计协作取消、中断或超时机制。取消一个组合阶段，也不能直接等同于取消全部输入任务。
