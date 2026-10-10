---
title: Java 线程池与任务执行
description: 整理线程池创建、任务提交流程、Worker 与 ctl 设计、参数选择和关闭机制。
date: 2026-05-25
category:
- 学习资源
tag:
- Java
- 并发
- 线程池
- 知识梳理
---

整理线程池创建、任务提交流程、Worker 与 ctl 设计、参数选择和关闭机制。线程、中断和锁的基础见 [Java 并发、锁与 ThreadLocal](./concurrency.md)，任务之间的依赖见 [CompletableFuture 异步编排](./completable-future.md)。

## 为什么使用线程池

线程池复用工作线程，减少反复创建和销毁线程的开销，并通过线程数量、任务队列和拒绝策略管理并发任务。

一个 Worker 通常会循环执行多个任务，任务结束不代表线程随之结束。队列为空时，工作线程通过阻塞或带超时的等待获取任务，不会一直占用处理器进行空循环。

## 创建线程池的方式

### Executors 工厂方法

常见工厂方法如下，这不是全部创建方式的固定枚举：

| 方法 | 主要特点 | 需要注意的限制 |
| --- | --- | --- |
| `newFixedThreadPool(n)` | 固定数量的工作线程，线程异常退出后可以补充 | 通常使用无界队列，任务持续积压可能占用大量内存 |
| `newSingleThreadExecutor()` | 单个工作线程顺序处理任务 | 通常使用无界队列，慢任务会影响后续任务 |
| `newCachedThreadPool()` | 使用直接交接队列，按需创建和回收空闲线程 | 最大线程数为 `Integer.MAX_VALUE`，大量阻塞任务可能导致线程过多 |
| `newScheduledThreadPool(n)` | 支持延迟和周期任务 | 定时任务也需要关注执行时间、异常和积压 |
| `newSingleThreadScheduledExecutor()` | 单线程执行延迟和周期任务 | 一个长时间运行的任务会延后其他任务 |
| `newWorkStealingPool()` | 基于 `ForkJoinPool` 的工作窃取调度 | 不属于定时线程池，不保证任务的执行顺序 |

根据业务显式选择队列容量、线程数量和拒绝方式，可以让资源限制更清楚。使用工厂方法时，也需要了解其默认配置。

### ThreadPoolExecutor

```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(
        4,
        8,
        60L,
        TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(200),
        Executors.defaultThreadFactory(),
        new ThreadPoolExecutor.AbortPolicy()
);
```

这里的数值仅用于演示构造参数，实际配置应通过任务耗时、到达速率和资源容量确定。线程默认按需创建，需要提前启动核心线程时，可使用 `prestartCoreThread()` 或 `prestartAllCoreThreads()`。

## 七个核心构造参数

| 参数 | 含义 |
| --- | --- |
| `corePoolSize` | 优先创建工作线程时使用的数量阈值；默认空闲时保留这一数量的线程 |
| `maximumPoolSize` | 允许创建的最大工作线程数 |
| `keepAliveTime` | 允许超时回收的工作线程，空闲等待任务的最长时间 |
| `unit` | `keepAliveTime` 的时间单位 |
| `workQueue` | 保存等待执行任务的阻塞队列 |
| `threadFactory` | 创建工作线程，可统一设置名称和其他线程属性 |
| `handler` | 无法接收任务时使用的拒绝策略 |

`keepAliveTime` 不是任务最长执行时间，也不会因为任务运行太久就强制停止任务。

### 常见任务队列

| 队列 | 特点 | 对线程池的影响 |
| --- | --- | --- |
| `ArrayBlockingQueue` | 固定容量的有界队列 | 容量满后才有机会继续扩展到最大线程数 |
| `LinkedBlockingQueue` | 可以指定容量；默认容量很大 | 使用无界配置时，任务通常持续入队，最大线程数难以发挥作用 |
| `SynchronousQueue` | 不存储任务，提交需要与获取配对 | 无法直接交接时需要创建线程或拒绝 |
| `PriorityBlockingQueue` | 按优先级出队，逻辑上无界 | 需关注积压及任务可比较性，不能假定按提交顺序执行 |

队列容量和最大线程数要一起考虑。例如，使用无界队列时，超过核心线程数的任务通常进入队列，而不会因为积压就自动扩展到 `maximumPoolSize`。

### 拒绝策略

拒绝不只发生在线程和队列都已达到容量时，线程池关闭后提交任务也会被拒绝。

| 策略 | 行为 |
| --- | --- |
| `AbortPolicy` | 默认策略，抛出 `RejectedExecutionException` |
| `CallerRunsPolicy` | 线程池未关闭时，由提交任务的线程执行；已关闭时不执行该任务 |
| `DiscardPolicy` | 静默丢弃任务 |
| `DiscardOldestPolicy` | 线程池未关闭时，移除队列头部任务，再尝试提交新任务 |
| 自定义 `RejectedExecutionHandler` | 根据业务决定记录、降级、持久化或返回失败等行为 |

`CallerRunsPolicy` 会增加提交线程的执行时间，若提交者是请求线程，就可能延长请求耗时。`DiscardOldestPolicy` 移除的是队列头部，对优先级队列不能简单解释为丢弃最早提交的任务。

使用 `submit()` 配合静默丢弃策略时，任务对应的 `Future` 还可能一直未完成。需要感知失败的任务，不应只依赖静默丢弃。

参数与队列的交互规则见 [ThreadPoolExecutor 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)。

## execute() 与 submit()

| 方法 | 接收的任务 | 返回值 | 任务异常的常见表现 |
| --- | --- | --- | --- |
| `execute(Runnable)` | `Runnable` | 无 | 未捕获的任务异常可能终止当前 Worker，线程池按需补充线程 |
| `submit(...)` | `Runnable` 或 `Callable` | `Future` | 通常由 `FutureTask` 保存异常，调用 `get()` 时通过 `ExecutionException` 报告 |

`submit()` 通常先把任务包装成 `RunnableFuture`，再交给 `execute()`。因此，原稿中线程池接收任务的核心代码属于 `execute()` 流程。

如果不检查 `submit()` 返回的 `Future`，又没有在任务内部正确处理异常，就可能遗漏任务失败。`afterExecute()` 接收的 `Throwable` 对 `FutureTask` 任务也可能为 `null`，不能单凭它判断任务一定成功。

### 核心线程与队列的关系

提交任务时，如果工作线程数还小于 `corePoolSize`，会优先尝试创建 Worker 并让其执行该任务；达到核心数量后，优先尝试入队。

![核心线程的创建流程示意图](./imgs/thread-pools-01.png)

### execute() 的提交流程

1. 工作线程数小于核心数量：尝试创建 Worker，直接执行任务。
2. 已达到核心数量且线程池仍运行：尝试将任务放入队列。
3. 队列无法接收：尝试在最大线程数量限制内创建 Worker。
4. 仍无法创建，或线程池不再接收任务：执行拒绝策略。

任务入队成功后还要复查线程池状态，处理提交与关闭同时发生的竞争；如果队列里有任务但工作线程数为零，还需要尝试启动线程处理队列。

以下为 OpenJDK 8 `execute()` 中的主要判断流程：

```java
int c = ctl.get();
if (workerCountOf(c) < corePoolSize) {
    if (addWorker(command, true)) {
        return;
    }
    c = ctl.get();
}
if (isRunning(c) && workQueue.offer(command)) {
    int recheck = ctl.get();
    if (!isRunning(recheck) && remove(command)) {
        reject(command);
    } else if (workerCountOf(recheck) == 0) {
        addWorker(null, false);
    }
} else if (!addWorker(command, false)) {
    reject(command);
}
```

`addWorker(command, true)` 中的布尔参数表示创建时按核心数量检查上限，不代表 Worker 从此具有永久不变的核心线程身份。

## Worker 如何复用线程

Worker 保存工作线程和首次任务。工作线程启动后进入 `runWorker()`，执行首次任务，再循环从队列获取任务。

![worker执行任务示意图](./imgs/thread-pools-02.png)

Worker 的 `run()` 把执行委托给线程池的 `runWorker()`：

![worker执行任务示意图](./imgs/thread-pools-03.png)

其核心循环可以简化为以下流程，省略了中断状态处理、执行钩子和异常退出等细节，不是可直接替换的 JDK 源码：

```java
Runnable task = worker.firstTask;
worker.firstTask = null;
while (task != null || (task = getTask()) != null) {
    worker.lock();
    try {
        task.run();
    } finally {
        task = null;
        worker.completedTasks++;
        worker.unlock();
    }
}
```

需要理解的关键点：

- 同一个工作线程循环执行多个任务，每次取任务不创建新线程。
- `getTask()` 可能阻塞等待；返回 `null` 则表示工作线程应退出。
- Worker 内部的锁用于标识是否正在执行任务，配合线程池的空闲线程中断逻辑。不能解释为避免同一个线程同时执行两个任务。
- 完整实现会调用 `beforeExecute()`、`afterExecute()`，并在退出时调用 `processWorkerExit()` 处理计数、终止判断和必要的线程补充。
- Worker 因任务异常退出，不意味着整个线程池必然关闭。

### getTask() 的等待与退出

以下流程按 OpenJDK 8 的实现说明：

```java
private Runnable getTask() {
    boolean timedOut = false;

    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {
            decrementWorkerCount();
            return null;
        }

        int wc = workerCountOf(c);
        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;
        if ((wc > maximumPoolSize || (timed && timedOut))
                && (wc > 1 || workQueue.isEmpty())) {
            if (compareAndDecrementWorkerCount(c)) {
                return null;
            }
            continue;
        }

        try {
            Runnable task = timed
                    ? workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS)
                    : workQueue.take();
            if (task != null) {
                return task;
            }
            timedOut = true;
        } catch (InterruptedException retry) {
            timedOut = false;
        }
    }
}
```

- `take()` 等待队列出现任务；`poll(timeout, unit)` 在超时前等待任务，超时返回 `null`。
- 当前数量大于核心数量，或启用了核心线程超时，才使用带超时的等待。
- `SHUTDOWN` 状态且队列为空，或者达到 `STOP`，工作线程应退出。
- 超时或调小最大线程数后，线程会按条件减少，CAS 失败则重新读取状态。
- 获取任务时被中断，会重新检查状态，而不是无条件认定线程必须退出。

调用 `allowCoreThreadTimeOut(true)` 可以允许核心数量范围内的空闲线程也超时退出，要求 `keepAliveTime` 大于零。这回收的是空闲线程，不会停止仍在执行的任务。

## ctl 如何同时保存状态和线程数

OpenJDK 8 的 `ThreadPoolExecutor` 使用一个 `AtomicInteger ctl` 保存运行状态与工作线程数量：

```text
+-------------------+-----------------------------------+
| 高 3 位：运行状态 | 低 29 位：工作线程数量            |
+-------------------+-----------------------------------+
```

相应的位运算形式为：

```java
private static final int COUNT_BITS = Integer.SIZE - 3;
private static final int CAPACITY = (1 << COUNT_BITS) - 1;

private static int runStateOf(int c) {
    return c & ~CAPACITY;
}

private static int workerCountOf(int c) {
    return c & CAPACITY;
}

private static int ctlOf(int rs, int wc) {
    return rs | wc;
}
```

合并后可以通过一次读取获得配套的状态和数量，并通过 CAS 协调状态转换和线程增减，减少维护两个独立变量的一致性难度。

工作线程数量不等于正在执行任务的线程数：空闲工作线程也包含在内；在创建和退出期间，计数与实际存活线程数量也可能有短暂差异。

| 状态 | JDK 8 中的高位取值 | 接收新任务 | 处理队列任务 | 说明 |
| --- | --- | --- | --- | --- |
| `RUNNING` | `-1 << COUNT_BITS` | 是 | 是 | 正常运行 |
| `SHUTDOWN` | `0 << COUNT_BITS` | 否 | 是 | `shutdown()` 后继续处理已接收任务 |
| `STOP` | `1 << COUNT_BITS` | 否 | 否 | `shutdownNow()` 后尝试中断正在执行的任务 |
| `TIDYING` | `2 << COUNT_BITS` | 否 | 否 | 已满足终止条件，工作线程数为零，执行 `terminated()` 钩子 |
| `TERMINATED` | `3 << COUNT_BITS` | 否 | 否 | 终止钩子执行结束 |

常见转换为 `RUNNING → SHUTDOWN → TIDYING → TERMINATED`，或者 `RUNNING / SHUTDOWN → STOP → TIDYING → TERMINATED`。调用关闭方法只是发起转换，不代表所有任务立即结束。

具体字段、Worker 和任务获取实现见 [OpenJDK 8 ThreadPoolExecutor 源码](https://github.com/openjdk/jdk8u/blob/master/jdk/src/share/classes/java/util/concurrent/ThreadPoolExecutor.java)。

## 如何选择线程数量

线程数量要与处理器资源、任务计算和等待时间、下游容量共同确定。

- CPU 密集型任务：可从实际可用处理器数量附近开始测试，过多线程可能增加切换与争用。`CPU 数量 + 1` 只是经验值。
- I/O 密集型任务：线程等待时可以让其他线程计算，但线程数还受连接池、远端限流、内存和响应时间要求限制。固定使用 `CPU 数量 × 2` 没有普遍依据。

一个常见的初始估算公式是：

```text
线程数 ≈ N × U × (1 + W / C)

N：实际可用处理器数量
U：目标处理器利用率，取值通常在 0 到 1 之间
W：单个任务的平均等待时间
C：单个任务的平均计算时间
```

例如，可用处理器数为 4，目标利用率为 1，平均计算 100ms、等待 900ms，则估算为 `4 × 1 × (1 + 900 / 100) = 40`。

这个结果只适合作为测试起点。还应监控吞吐量、任务排队时间、处理器占用、内存、拒绝数量和下游资源使用情况，再调整核心线程数、最大线程数和队列容量。

## 如何关闭线程池

- `shutdown()`：停止接收新任务，继续处理已提交的任务，不等待所有任务完成才返回。
- `shutdownNow()`：尝试中断执行中的任务，并返回队列中尚未开始的任务；不保证正在执行的任务一定停止。
- `awaitTermination(...)`：等待终止或超时，本身不会发起关闭。

可先正常关闭，超时后再请求中断：

```java
static boolean shutdownAndAwaitTermination(ExecutorService executor) {
    executor.shutdown();
    try {
        if (executor.awaitTermination(30, TimeUnit.SECONDS)) {
            return true;
        }
        executor.shutdownNow();
        return executor.awaitTermination(30, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
        executor.shutdownNow();
        Thread.currentThread().interrupt();
        return false;
    }
}
```

调用方应检查返回值，决定任务未能及时结束时如何处理。示例省略了待执行任务的业务补偿；`shutdownNow()` 返回的队列任务应根据需要重新调度或取消，不能假定每个相关 `Future` 都会自动进入取消状态。

运行中的任务应正确响应中断，并在 `finally` 中释放资源、清理线程本地上下文。相关规则见 [中断机制](./concurrency.md#中断机制) 和 [ThreadLocal](./concurrency.md#threadlocal)。
