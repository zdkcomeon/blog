---
title: Java 并发、锁与 ThreadLocal
description: 整理线程基础、JMM、ThreadLocal、synchronized、CAS、AQS、锁和线程通信。
date: 2026-06-22
category:
- 学习资源
tag:
- Java
- 并发
- 知识梳理
---

整理线程基础、JMM、ThreadLocal、synchronized、CAS、AQS、锁和线程通信。线程池见 [Java 线程池与任务执行](./thread-pools.md)，异步任务组合见 [CompletableFuture 异步编排](./completable-future.md)。

线程调度和守护属性默认以平台线程为例；涉及 JDK 内部字段和队列结构时，以文中注明的版本为准。

## 进程、线程与管程

### 进程和线程的关系

进程是操作系统分配和隔离资源的基本单位，线程是操作系统调度执行的基本单位。一个进程可以包含多个线程，同一进程中的线程共享进程资源，也各自保留执行所需的上下文。

通过 `java` 命令启动一个普通 Java 应用时，通常会创建一个 JVM 进程，`main` 方法在其中的主线程执行。直接把 `main` 当作普通方法调用，不会因此启动新的 JVM 进程。

| 对比项 | 进程 | 线程 |
| --- | --- | --- |
| 资源 | 通常有独立的地址空间 | 共享所属进程的资源 |
| 通信 | 需要进程间通信机制 | 可以通过共享对象通信，也需要同步措施 |
| 创建和切换 | 通常开销较大 | 通常开销较小，但频繁切换仍有成本 |
| 隔离 | 一个进程出错通常不直接破坏另一个进程的内存 | 线程错误可能影响整个进程 |

从 JVM 运行时数据区看，程序计数器、Java 虚拟机栈和本地方法栈是线程私有的，堆和方法区是线程共享的。

- 程序计数器用于记录当前线程正在执行的 JVM 指令地址；执行本地方法时，其值未定义。
- 栈保存方法调用的栈帧，包括局部变量、操作数栈等执行信息。
- 堆中的对象和共享的类信息需要能够被多个线程访问。

局部变量中的引用属于当前线程，并不意味着它指向的对象也是线程私有的。多个线程仍可能持有同一个对象的引用。运行时数据区的详细说明见 [JVM 运行机制与对象布局](./jvm-internals.md)。

### 管程是什么

管程即 Monitor，是一种管理互斥访问与条件等待的同步机制。Java 中，每个对象都关联一个监视器，`synchronized` 的语义基于监视器的进入与退出。

这不代表 JVM 一定在每个对象创建时就分配一个独立的重量级 `ObjectMonitor`。HotSpot 可以使用对象头、快速加锁和锁膨胀等实现方式，具体取决于 JDK 版本和运行条件。

### 并发与并行

- 并发：多个任务在同一时间段内推进，可能通过交替执行完成。
- 并行：多个任务在同一时刻执行，需要相应的硬件执行资源。

单个处理器核心上的多个线程可以并发执行；多个核心则可以让多个线程并行执行。两者可以同时存在。

### 为什么使用多线程

多线程可以利用多个处理器核心，也可以在某些任务等待 I/O 时，让其他任务继续执行。是否提升性能，要看任务之间的依赖、同步开销和资源限制。

常见问题包括共享数据竞争、可见性错误、死锁、线程过多导致的上下文切换，以及线程本地数据未清理造成的内存占用。增加线程数不会自动提高吞吐量。

### 上下文切换

调度器切换正在执行的线程时，需要保存和恢复寄存器、执行位置等上下文。时间片用尽、阻塞等待、线程结束以及调度策略都可能触发切换。

频繁切换会消耗处理器时间，并可能影响缓存命中率。`interrupt()` 只是发出中断请求，不等于立即终止线程，也不能直接等同于一次上下文切换。

## Java 线程的生命周期

Java 的 `Thread.State` 定义了六种状态，并没有独立的就绪和运行两个枚举值。具体定义见 [Thread.State 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Thread.State.html)。

| 状态 | 含义 | 常见场景 |
| --- | --- | --- |
| `NEW` | 已创建，尚未启动 | `new Thread(...)` 后未调用 `start()` |
| `RUNNABLE` | 在 JVM 中执行，或等待处理器等执行资源 | 已启动的计算任务 |
| `BLOCKED` | 等待进入或重新进入对象监视器 | 竞争 `synchronized` 锁 |
| `WAITING` | 无期限等待其他线程的动作 | `Object.wait()`、无超时 `join()`、`LockSupport.park()` |
| `TIMED_WAITING` | 在指定时间内等待 | `sleep()`、带超时的 `wait()`、`join()`、`parkNanos()` |
| `TERMINATED` | 执行结束 | `run()` 正常返回或因未捕获异常结束 |

线程状态属于 JVM 层面的分类，不能直接对应操作系统的所有调度状态。例如，某些正在等待 I/O 的线程仍可能显示为 `RUNNABLE`。等待 AQS 锁的线程通常通过 `park()` 等待，也不应一概描述为 `BLOCKED`。

### start() 与 run()

`start()` 启动一个新线程，由新线程执行 `run()`。一个 `Thread` 实例只能启动一次，重复启动会抛出 `IllegalThreadStateException`。

直接调用 `run()` 是当前调用线程中的普通方法调用，不会创建新线程，也不一定由主线程执行。

### sleep()、wait() 与 join()

| 方法 | 作用 | 是否释放已有锁 | 使用条件 |
| --- | --- | --- | --- |
| `Thread.sleep(...)` | 暂停当前线程一段时间 | 不释放已持有的监视器 | 不要求持有监视器 |
| `object.wait(...)` | 等待对象上的条件变化 | 释放该对象的监视器，不释放其他对象的锁 | 必须持有该对象的监视器 |
| `thread.join(...)` | 等待目标线程结束 | 不作为释放调用方所持有业务锁的机制 | 调用方应避免持锁等待目标线程 |

`wait()` 可能因为通知、中断、超时或虚假唤醒而返回。返回前还必须重新获得该对象的监视器。`notify()` 不会立即把锁交给等待线程，通知线程仍需退出同步区域。

等待条件应放在循环中检查，且条件的读写使用同一把锁：

```java
final class Signal {
    private boolean ready;

    public synchronized void awaitReady() throws InterruptedException {
        while (!ready) {
            wait();
        }
    }

    public synchronized void markReady() {
        ready = true;
        notifyAll();
    }
}
```

即使 `markReady()` 先执行，后来的等待线程也会通过 `ready` 判断是否需要等待。正确的条件检查可以避免单纯依赖通知顺序导致的问题。等待与通知的规范见 [JLS 17.2](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.2)。

### 用户线程与守护线程

对于普通平台线程，`setDaemon(true)` 可以把线程设为守护线程，必须在 `start()` 前设置。新线程默认继承创建它的线程的守护属性，并非在所有情况下都默认是用户线程。

当所有已启动的非守护线程结束后，JVM 可以开始正常退出。不能依赖守护线程完成必须执行的持久化、资源清理或其他收尾工作。

## 中断机制

中断是线程之间协作取消的一种方式。线程收到中断请求后，是否停止以及如何清理资源，由执行代码和所用 API 决定。

| 方法 | 作用 | 是否清除中断标记 |
| --- | --- | --- |
| `thread.interrupt()` | 向目标线程发出中断请求 | 不以查询和清除标记为目的 |
| `thread.isInterrupted()` | 查询目标线程的中断标记 | 不清除 |
| `Thread.interrupted()` | 查询当前线程的中断标记 | 清除 |

`sleep()`、`wait()`、`join()` 在等待中收到中断时会抛出 `InterruptedException`，并清除中断标记。不能简单地认为所有阻塞操作都以这种方式响应中断：等待进入 `synchronized` 不支持可中断获取，传统阻塞 I/O 也要看具体 API。

如果当前方法不能把 `InterruptedException` 继续向上抛出，常见做法是恢复中断标记并结束当前任务：

```java
while (!Thread.currentThread().isInterrupted()) {
    try {
        Thread.sleep(1000);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        break;
    }
}
```

不要捕获异常后无条件继续循环，否则可能让取消请求失效。也不应使用已废弃的 `Thread.stop()` 强制终止线程。

## 死锁及排查

死锁是多个线程因资源依赖而相互等待，导致都无法继续执行。例如，线程 A 持有锁 1 等待锁 2，线程 B 持有锁 2 等待锁 1。

产生资源死锁的四个必要条件是：

1. 互斥：资源不能同时被多个线程占用。
2. 持有并等待：持有部分资源的同时等待其他资源。
3. 不可剥夺：资源只能由持有者主动释放。
4. 循环等待：存在首尾相连的等待关系。

常见预防方式包括统一加锁顺序、避免持锁调用不可控的外部逻辑，以及使用带超时的 `tryLock()`。获取多把锁失败后，应释放已经获得的锁，再按策略重试。超时获取只是提供退出等待的机会，仍需正确实现释放和重试逻辑。

如果业务允许，也可以通过统一管理机制一次性分配所需资源，避免部分资源已被占用后再等待其他资源。逐个获取多把锁并不能自动满足这个要求。

可重入锁允许同一线程重复获得同一把锁，不能解决多个线程之间的循环等待。

排查时先定位 Java 进程，再查看线程栈：

```bash
jps -l
jstack <pid>
```

检查线程正在等待的锁、已持有的锁和是否存在循环依赖。`jstack` 可能直接给出 Java 级死锁检测结果；也可以在 `jconsole` 的线程页面检测死锁。工具需要相应的进程访问权限，且不能保证识别所有外部资源等待。

## ThreadLocal

### 用途和对象关系

`ThreadLocal<T>` 提供线程本地变量访问。同一个 `ThreadLocal` 实例在不同线程中可以关联不同的值，常用于请求上下文、事务上下文等需要在同一线程内传递的数据。

它隔离的是每个线程关联的值，不会自动复制对象。如果多个线程主动把同一个可变对象存进去，仍然需要处理该对象的并发访问。

在常见的 OpenJDK 实现中，对象关系如下：

```text
Thread
  └─ threadLocals: ThreadLocalMap
       └─ Entry[] table
            ├─ key: ThreadLocal 的弱引用
            └─ value: 实际数据的强引用
```

`ThreadLocalMap` 是 `ThreadLocal` 的内部实现，不是普通 `HashMap`。它使用数组和开放地址法处理散列冲突，发生冲突后继续探测其他槽位。

### set()、get() 与 remove()

| 操作 | 主要流程 |
| --- | --- |
| `set(value)` | 获取当前线程的 Map，以当前 `ThreadLocal` 为键设置值；必要时创建 Map |
| `get()` | 查找当前线程中的条目；不存在时调用 `initialValue()` 并保存初始值 |
| `remove()` | 删除当前线程中当前 `ThreadLocal` 对应的条目 |

创建 `ThreadLocal` 对象与初始化线程本地值是两件事。默认的 `initialValue()` 返回 `null`，自定义初始值通常在各线程首次 `get()` 时分别生成；先调用 `set()` 则不需要通过 `get()` 初始化。`remove()` 后再次 `get()` 会重新初始化。详见 [ThreadLocal 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ThreadLocal.html)。

JDK 8 起可以使用 `withInitial()`：

```java
ThreadLocal<StringBuilder> buffer = ThreadLocal.withInitial(StringBuilder::new);
```

也可以覆盖 `initialValue()`：

```java
ThreadLocal<StringBuilder> buffer = new ThreadLocal<StringBuilder>() {
    @Override
    protected StringBuilder initialValue() {
        return new StringBuilder();
    }
};
```

### 弱引用与内存泄漏

`Entry` 的键是弱引用，不是虚引用。设计成弱引用，可以避免线程内部的 Map 在外部已不再使用 `ThreadLocal` 时，仍通过键阻止它被回收。

但值仍然存在强引用链：

```text
仍然存活的线程 → ThreadLocalMap → Entry → value
```

键被回收后，条目的键变为 `null`，值不一定随之释放。Map 的某些访问、插入和删除路径会清理失效条目，但清理是局部、机会式的，不能理解为每次 `get()` 都会清理所有失效值。

在线程池中，线程可能远比单次任务活得久。未清理的值既可能长期占用内存，也可能被下一次复用该线程的任务读到。`ThreadLocal` 可以配合线程池使用，但应在任务边界通过 `finally` 清理：

```java
final class RequestContext {
    private static final ThreadLocal<String> REQUEST_ID = new ThreadLocal<>();

    public static void run(String requestId, Runnable task) {
        REQUEST_ID.set(requestId);
        try {
            task.run();
        } finally {
            REQUEST_ID.remove();
        }
    }

    public static String currentRequestId() {
        return REQUEST_ID.get();
    }
}
```

这个示例适用于一次建立、一次清理的任务边界。如果上下文允许嵌套设置，还应保存旧值，并在退出内层调用时恢复外层值。

强引用是一种引用关系，不能说它是软引用、弱引用和虚引用的父类。后三者对应的类继承自 `java.lang.ref.Reference`。引用类型的区别见 [JVM 运行机制与对象布局](./jvm-internals.md)。

### 父子线程与线程池中的传递

普通 `ThreadLocal` 不会自动把父线程的值传给子线程。`InheritableThreadLocal` 通常在线程创建时生成继承值，默认可能传递同一个对象引用，并不自动深拷贝。

继承完成后，父线程再修改自己的关联值，不会自动更新子线程的条目。如果两边持有同一个可变对象，其内部变化则仍可能彼此影响。

线程池复用已有线程，提交一个任务不等于创建一个子线程。因此，不能依靠 `InheritableThreadLocal` 自动传递每次提交时的最新上下文。需要传递时，应在提交处捕获上下文，在执行处设置，并在任务结束后清理或恢复原值。

## Java 内存模型与重排序

### 原子性、可见性和有序性

JMM 即 Java Memory Model，定义多线程程序中共享内存访问允许出现的行为。它是语言层面的规则，不能直接等同于某一种 CPU 的缓存结构。

| 性质 | 含义 | 常见措施 |
| --- | --- | --- |
| 原子性 | 操作不会被其他线程观察为执行到一半的状态 | 锁、原子变量 |
| 可见性 | 一个线程的写入按同步规则对其他线程可见 | `volatile`、锁、线程启动与结束规则 |
| 有序性 | 操作之间满足程序要求的先后关系 | happens-before 关系及相应同步机制 |

`i++` 包含读、加一、写三个步骤，不是原子操作。即使 `i` 被声明为 `volatile`，两个线程也可能读到同一个旧值，导致更新丢失。原子性也不等于数据库事务的自动回滚语义。

### 指令重排序

编译器和处理器可以在满足约束的前提下调整操作的实现顺序。编译器优化、处理器乱序执行，以及存储缓冲等内存系统行为，都可能影响其他线程观察到的顺序。

`as-if-serial` 要求单线程执行结果符合该线程的程序语义；多线程程序还需要通过 JMM 的同步规则约束共享数据访问。不能把所有可见性问题都归结为某条指令被物理地交换了位置，也不需要禁止所有优化。

### happens-before 规则

如果操作 A happens-before 操作 B，那么 A 的效果必须按规则对 B 可见，并满足相应的顺序要求。它描述可观察行为的约束，不要求每一步都按源码顺序在硬件上执行。

| 规则 | 含义 |
| --- | --- |
| 程序顺序 | 同一线程中，前面的动作 happens-before 后面的动作 |
| 监视器锁 | 对某个监视器的解锁 happens-before 随后对同一监视器的加锁 |
| `volatile` | 对某个 `volatile` 变量的写 happens-before 随后对该变量的读 |
| 线程启动 | 调用 `start()` happens-before 被启动线程中的动作 |
| 线程结束 | 线程中的动作 happens-before 其他线程成功检测到它结束，例如 `join()` 正常返回 |
| 中断 | 发出中断 happens-before 其他线程检测到该中断 |
| 传递性 | A happens-before B，B happens-before C，则 A happens-before C |

规范还定义了构造结束到终结器开始的关系，但不能据此推导任意对象销毁顺序，也不应依靠已废弃的终结机制管理资源。完整定义见 [JLS 17.4.5](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.5)。

### volatile 的作用与限制

`volatile` 适用于字段，为该变量的访问提供可见性和顺序保证。它不提供对多步复合操作的互斥保护，也不会禁止 JVM 对无关代码进行所有优化。

引用字段声明为 `volatile`，保护的是该引用的读写和相应发布关系，不会自动让被引用对象的所有后续字段修改具备同样的保证。

例如，生产线程先写数据，再发布状态：

```java
final class Publication {
    private int value;
    private volatile boolean ready;

    public void publish() {
        value = 42;
        ready = true;
    }

    public int readIfReady() {
        return ready ? value : -1;
    }
}
```

在一次发布且不再修改 `value` 的前提下，读取到 `ready == true` 的线程可以看到此前写入的 `value`。这是同步规则提供的保证，不需要把它解释为所有缓存立即刷新到某一块物理主存。

内存屏障常用以下名称描述需要维持的访问顺序：

| 屏障 | 约束的访问顺序 |
| --- | --- |
| `LoadLoad` | 前面的读与后面的读 |
| `LoadStore` | 前面的读与后面的写 |
| `StoreStore` | 前面的写与后面的写 |
| `StoreLoad` | 前面的写与后面的读 |

这些是理解实现的抽象分类。具体使用哪些机器指令、是否可以省略某些屏障，取决于处理器架构、JVM 和上下文，不能把它们固定对应为某条 Java 字节码或某个 `lock` 前缀指令。

### 双重检查锁定

延迟初始化单例时，双重检查锁定需要使用 `volatile` 安全发布对象：

```java
final class Singleton {
    private static volatile Singleton instance;

    private Singleton() {
    }

    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

外层检查减少初始化后的加锁次数；内层检查避免多个线程重复创建对象；`volatile` 保证读取到已发布引用时，能够观察到构造期间的初始化结果。

## synchronized

### 锁定的对象

| 写法 | 使用的监视器 |
| --- | --- |
| 实例同步方法 | 当前对象 `this` |
| 静态同步方法 | 当前类对应的 `Class` 对象 |
| `synchronized (lock)` | 表达式求值得到的对象 |

只有竞争同一个监视器的代码才相互排斥。对不同实例调用实例同步方法，通常使用不同的锁。也应避免使用可能被其他代码共享的字符串常量作为业务锁，可以使用专门的、引用稳定的锁对象。

```java
final class Counter {
    private final Object lock = new Object();
    private int count;

    public void increment() {
        synchronized (lock) {
            count++;
        }
    }

    public int get() {
        synchronized (lock) {
            return count;
        }
    }
}
```

锁保护的是约定范围内的访问。其他线程如果绕过同一把锁直接访问字段，仍可能发生数据竞争。

### 字节码和监视器实现

同步代码块通过 `monitorenter` 和 `monitorexit` 表达进入和退出监视器，异常退出路径也需要释放已获得的监视器。同步方法通过方法访问标志 `ACC_SYNCHRONIZED` 表达同步语义，并不要求方法体里出现同样的指令序列。

HotSpot 的重量级监视器实现会维护所有者、重入信息、进入等待者和条件等待者等信息。具体字段和快速加锁实现属于 JVM 内部细节，会随版本变化。

`synchronized` 是可重入、非公平的锁。持有者再次进入同一监视器不会与自己互相等待；退出同步区域时自动释放一次重入，最终完全退出才允许其他线程获得锁。异常退出会释放相应监视器，但不能据此认为程序不会发生死锁。

### 锁消除、锁粗化与历史实现

- 锁消除：JIT 在证明某些同步没有必要时，可能移除相应加锁操作，例如对象不会被其他线程访问的情况。
- 锁粗化：JIT 可能把相邻的多次加锁合并，以减少反复获取和释放的开销。
- 偏向锁、轻量级锁和重量级锁：常见于旧版 HotSpot 的实现分析，用于应对不同竞争情况。

锁的实现随 JDK 版本演进，不能把旧版的偏向锁状态当作所有版本默认启用的机制，也不应把锁的变化概括成适用于所有版本的单向升级流程。轻量级加锁发生竞争后可能膨胀为监视器，空闲监视器也可能被回收。

旧版偏向锁分析中，身份哈希码的存放位置可能与偏向锁元数据冲突；这里指 `System.identityHashCode()` 等涉及的身份哈希码，不能把任意重写的 `hashCode()` 方法都当作同一回事。

### synchronized 与 volatile

| 对比项 | `synchronized` | `volatile` |
| --- | --- | --- |
| 使用位置 | 同步方法或同步代码块 | 字段 |
| 互斥 | 竞争同一监视器的线程互斥 | 不提供互斥 |
| 可见性与顺序 | 通过解锁、加锁关系提供保证 | 通过该字段的写、读关系提供保证 |
| 复合操作 | 可以保护同一临界区中的多步操作 | 不能单独保证 `i++` 等操作的原子性 |
| 等待 | 竞争失败可能等待 | 普通读写不因锁竞争而等待 |

## CAS 与原子类

### 悲观并发控制与乐观并发控制

悲观方式在访问共享状态前先获得互斥保护，`synchronized` 和 `ReentrantLock` 属于常见做法。乐观方式先基于当前状态计算或读取，再通过 CAS、版本号等方式检查冲突，失败后重试或改用其他处理。

锁的内部实现也可能使用 CAS，这不意味着所有使用 CAS 的代码都不加锁。两类方式的效果取决于竞争程度、临界区大小和失败后的处理方式。

### CAS 的基本过程

CAS 即 Compare-And-Set，比较当前位置的实际值与预期值：相同则原子地写入新值，不同则更新失败。是否重试、如何计算新的预期值，由调用方决定。

```java
AtomicInteger counter = new AtomicInteger();
int current;
do {
    current = counter.get();
} while (!counter.compareAndSet(current, current + 1));
```

上面的循环演示 CAS 重试，实际计数通常直接使用 `incrementAndGet()`。CAS 是原子操作机制，自旋是失败后反复尝试的等待方式，两者不能直接画等号。

旧版 JDK 源码经常通过 `Unsafe` 访问底层原子能力。应用代码应优先使用公开的原子类或 `VarHandle`，无需依赖内部 `Unsafe` API。具体机器指令取决于硬件架构。

### CAS 的局限

- ABA：值从 A 变成 B 后又变回 A，单纯比较当前值无法识别中间变化。需要区分版本时，可以使用 `AtomicStampedReference` 等带版本信息的方案。
- 竞争成本：高竞争下反复重试会消耗处理器时间，可能需要退避、阻塞等待或锁。
- 保护范围：一次 CAS 只原子地更新其目标位置，不能自动让多个独立变量的更新组成一个原子操作。

`AtomicReference<T>` 原子地更新对象引用，不会自动保护被引用对象的所有内部字段。`AtomicMarkableReference` 提供布尔标记，但布尔标记不能替代可区分多次变化的版本号。

### 常见原子类

| 类别 | 示例 | 作用 |
| --- | --- | --- |
| 基本数值 | `AtomicInteger`、`AtomicLong` | 原子读写、比较更新与累加 |
| 布尔与引用 | `AtomicBoolean`、`AtomicReference` | 原子更新状态或引用 |
| 数组 | `AtomicIntegerArray`、`AtomicReferenceArray` | 原子更新指定元素 |
| 字段更新器 | `AtomicIntegerFieldUpdater` 等 | 按其访问和字段声明约束更新指定字段 |
| 分散累加 | `LongAdder`、`LongAccumulator` | 减少高竞争下对单个位置的更新争用 |

### LongAdder 与 LongAccumulator

`LongAdder` 在竞争较低时可以更新 `base`，竞争上升后可以把更新分散到多个 `Cell`，读取时汇总。相对于 `AtomicLong`，它通常用更多空间换取高竞争累加场景的吞吐量。

```java
LongAdder requests = new LongAdder();
requests.increment();
requests.add(9);
long total = requests.sum();
```

并发更新期间，`sum()` 不是所有更新的原子快照，不能把它用于必须精确判断的余额扣减或容量限额。`reset()`、`sumThenReset()` 也不适合在仍有并发更新时承担精确结算职责。见 [LongAdder 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html)。

`LongAccumulator` 支持自定义累积函数。函数应无副作用，并适合以不同顺序和分组进行合并，初始值应是该操作的单位元：

```java
LongAccumulator maximum = new LongAccumulator(Long::max, Long.MIN_VALUE);
maximum.accumulate(10);
maximum.accumulate(20);
long max = maximum.get();

LongAccumulator product = new LongAccumulator((left, right) -> left * right, 1);
product.accumulate(3);
product.accumulate(4);
long multiplied = product.get();
```

乘法的单位元是 `1`，使用 `10` 作为初始值会改变合并结果。`LongAccumulator.get()` 同样不保证并发更新时的原子快照。见 [LongAccumulator 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/LongAccumulator.html)。

## AQS 与 ReentrantLock

### AQS 负责什么

`AbstractQueuedSynchronizer` 使用同步状态 `state` 和等待队列，为独占、共享两种获取模式提供排队、阻塞、唤醒和取消等通用机制。

子类通过 `tryAcquire()`、`tryRelease()`、`tryAcquireShared()`、`tryReleaseShared()`、`isHeldExclusively()` 等方法定义具体规则。`tryLock()` 是锁对外提供的 API 名称，不能当作所有 AQS 子类都要覆盖的模板方法。

典型使用者包括 `ReentrantLock`、`ReentrantReadWriteLock`、`Semaphore` 和 `CountDownLatch`。不能因为某个并发类也有等待队列，就认定它基于 AQS。参见 [AQS 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/AbstractQueuedSynchronizer.html)。

AQS 继承的 `AbstractOwnableSynchronizer` 提供独占所有者线程的记录能力。等待节点中的 `thread` 记录排队线程，所有者字段记录当前持有线程，两者职责不同。

### JDK 8 中的等待节点

下面的字段和状态针对 OpenJDK 8 的实现阅读，后续 JDK 的节点结构可能不同：

| 字段 | 含义 |
| --- | --- |
| `thread` | 等待线程 |
| `prev`、`next` | 同步队列中的前驱和后继 |
| `waitStatus` | 节点等待状态 |
| `nextWaiter` | 条件队列链接，或用于标记共享模式 |

同步队列包含头、尾节点，头节点通常作为占位节点，不等同于一个正在等待的业务线程。

| `waitStatus` | 含义 |
| --- | --- |
| `0` | 初始状态 |
| `CANCELLED = 1` | 等待已取消 |
| `SIGNAL = -1` | 后继需要被通知；当前节点释放或取消时应唤醒后继 |
| `CONDITION = -2` | 节点位于条件队列 |
| `PROPAGATE = -3` | 共享模式下需要继续传播唤醒 |

`SIGNAL` 描述前驱对后继的通知责任，不能解释为该前驱已经获得锁。字段定义见 [OpenJDK 8 AQS 源码](https://github.com/openjdk/jdk8u/blob/master/jdk/src/share/classes/java/util/concurrent/locks/AbstractQueuedSynchronizer.java)。

### ReentrantLock 获取与释放

`ReentrantLock` 使用 AQS 的独占模式。典型实现中，`state == 0` 表示未持有，持有后的正数表示重入次数，所有者字段记录持有线程。

非公平获取的大致流程是：

1. 尝试通过 CAS 把状态从 `0` 改为 `1`，成功后设置所有者。
2. 如果当前线程已经是所有者，增加重入次数。
3. 获取失败时加入同步队列，前驱为头节点时再次尝试获取。
4. 需要等待时，先建立前驱的通知责任，再通过 `LockSupport.park()` 等待。
5. 被唤醒后重新检查和尝试获取，成功后推进头节点。

在 JDK 8 中，`acquire()` 尝试获取失败后，通过 `addWaiter()` 入队，再由 `acquireQueued()` 重试或等待。入队的 CAS 失败时会在 `enq()` 中继续尝试，必要时初始化队列。

在 `shouldParkAfterFailedAcquire()` 中，前驱已是 `SIGNAL` 才适合阻塞等待；前驱已取消则跳过；否则先把前驱改为 `SIGNAL`，再循环检查。这样可以协调释放与等待之间的竞争，避免遗漏唤醒。

普通 `lock()` 不会因等待期间的中断立即放弃获取。JDK 8 的相关流程会记录中断，并在最终获得锁后恢复中断标记。需要可中断获取时应使用 `lockInterruptibly()`。

释放时由 `release()` 调用 `tryRelease()`，检查当前线程是否为所有者，然后减少重入次数。降为 `0` 才完全释放，并通过 `unparkSuccessor()` 唤醒合适的后继。被唤醒的线程仍要竞争锁，唤醒不等于已经获得锁。遇到取消节点或尚未完成的后继链接时，JDK 8 的实现还可能从尾部反向寻找可唤醒节点。

### 使用方式与公平性

```java
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    // 访问由这把锁保护的共享状态。
} finally {
    lock.unlock();
}
```

`new ReentrantLock(true)` 请求公平获取策略，在竞争时更倾向于等待较久的线程，但不能保证操作系统公平调度，也不能保证吞吐量更高。不带超时的 `tryLock()` 可以直接尝试获取，不遵守同样的排队公平规则。

| 对比项 | `synchronized` | `ReentrantLock` |
| --- | --- | --- |
| 实现 | JVM 语言级监视器 | JDK 类，基于 AQS |
| 重入 | 支持 | 支持 |
| 释放 | 退出同步区域时自动释放 | 必须显式 `unlock()`，通常放在 `finally` |
| 公平性 | 非公平 | 可选择公平或非公平 |
| 获取控制 | 不提供同等的超时、可中断获取 API | 支持 `tryLock()`、超时获取、`lockInterruptibly()` |
| 条件等待 | 对象上的 `wait()`、`notify()`、`notifyAll()` | 可创建多个 `Condition` |

`Lock` 接口的其他实现可以采用不同的重入规则，但 `ReentrantLock` 本身就是可重入锁。

## 读写锁与 StampedLock

### ReentrantReadWriteLock

读写锁把访问分为共享读锁和独占写锁。多个读线程可以同时持有读锁，写锁与其他线程持有的读、写锁互斥，适合读操作明显多于写操作且临界区有一定成本的场景。

`ReentrantReadWriteLock` 基于 AQS，以不同部分的状态位表达读写持有情况，并额外记录读锁重入信息。持有写锁的线程可以再获取读锁，然后释放写锁，完成锁降级。

在 OpenJDK 8 中，`state` 的高 16 位表示读锁总持有次数，低 16 位表示写锁重入次数。读锁持有次数不等于不同读线程的数量，因为同一个线程也可以重复获取读锁。

```java
ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
lock.writeLock().lock();
try {
    // 修改共享状态。
    lock.readLock().lock();
} finally {
    lock.writeLock().unlock();
}

try {
    // 在读锁保护下继续读取修改后的状态。
} finally {
    lock.readLock().unlock();
}
```

不支持在持有读锁时阻塞等待写锁的直接升级方式，这会让等待者无法满足写锁所需的条件。需要修改时，应释放读锁后获取写锁，并重新检查状态。锁降级和公平性的规则见 [ReentrantReadWriteLock 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReentrantReadWriteLock.html)。

读写锁也存在同步开销和等待问题。选择公平策略或读写分离，并不能保证所有场景下都更快。

### StampedLock

`StampedLock` 提供写锁、读锁和乐观读。操作返回的 `stamp` 用于校验或解锁，它不是可重入锁，也不提供与 `ReentrantLock` 相同的条件等待 API。

乐观读不会阻塞写线程，应先把需要读取的字段复制到局部变量，再验证版本。如果校验失败，改为在读锁保护下重新读取：

```java
final class Point {
    private final StampedLock lock = new StampedLock();
    private double x;
    private double y;

    public void move(double deltaX, double deltaY) {
        long stamp = lock.writeLock();
        try {
            x += deltaX;
            y += deltaY;
        } finally {
            lock.unlockWrite(stamp);
        }
    }

    public double distanceFromOrigin() {
        long stamp = lock.tryOptimisticRead();
        double currentX = x;
        double currentY = y;
        if (!lock.validate(stamp)) {
            stamp = lock.readLock();
            try {
                currentX = x;
                currentY = y;
            } finally {
                lock.unlockRead(stamp);
            }
        }
        return Math.hypot(currentX, currentY);
    }
}
```

乐观读期间可能读到不一致的中间值，不能在验证前执行依赖这些值的不可逆操作。它可能适合特定读多写少场景，但不能宣称始终比读写锁快或保证消除饥饿。见 [StampedLock 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/StampedLock.html)。

## 线程通信与等待机制

### Condition

`Condition` 与对应的锁配合使用。调用 `await()` 前必须持有锁，等待时释放锁，返回或抛出中断异常前重新获取锁。使用 `ReentrantLock` 时，重入持有状态也会被相应释放和恢复。

`signal()` 把合适的条件等待者转移到同步队列，等待线程重新竞争锁。它不会让等待线程立即运行，也不会提前释放通知者持有的锁。

```java
final class ReadyCondition {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition changed = lock.newCondition();
    private boolean ready;

    public void awaitReady() throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (!ready) {
                changed.await();
            }
        } finally {
            lock.unlock();
        }
    }

    public void markReady() {
        lock.lock();
        try {
            ready = true;
            changed.signalAll();
        } finally {
            lock.unlock();
        }
    }
}
```

同一把 `ReentrantLock` 可以创建多个 `Condition`，分别等待不同的业务条件。条件队列与 AQS 的同步队列有不同职责。

### LockSupport

`LockSupport` 以线程为单位提供 `park()` 和 `unpark(thread)`，不要求先持有对象监视器。

- 每个线程最多保留一个许可，多次 `unpark()` 不会累计多个许可。
- 对已启动线程，可以先 `unpark()` 再 `park()`，后者消费已有许可后返回；在线程启动前调用 `unpark()` 不保证生效。
- `park()` 还可能因中断或虚假唤醒返回，返回本身不会清除中断标记。
- 仍需在循环中检查具有正确可见性保证的业务条件，不能把一次返回当作条件必然满足。

`wait()` 和 `Condition.await()` 本身不保存这样的许可，但配合锁和条件谓词循环，也可以正确处理通知先于等待的情况。不能简单地认为它们必须先等待、后通知才可用。详见 [LockSupport 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/LockSupport.html)。

## 原有延伸阅读

- [指令重排序介绍](https://zhuanlan.zhihu.com/p/298448987)
- [内存访问顺序与可见性说明](https://cloud.tencent.com/developer/article/1857174)

第三方文章中的缓存、屏障和锁状态示意需要结合 JMM 规范及具体 JDK 版本理解。
