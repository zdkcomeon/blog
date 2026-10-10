---
title: CompletableFuture 异步编排
description: 整理异步任务提交、完成回调、异常处理、任务依赖和等待机制。
category:
- 学习资源
tag:
- Java
- 并发
- CompletableFuture
- 知识梳理
---

整理异步任务提交、完成回调、异常处理、任务依赖和等待机制。

## CompletableFuture

### 优点，相对于Future

+ 异步任务结束时，会自动回调某个对象的方法；
+ 异步任务出错时，会自动回调某个对象的方法；
+ 主线程设置好回调后，不再关心异步任务的执行；
+ 支持配置线程池；
+ 支持任务之间依赖编排，多个`CompletableFuture`可以串行执行，除了串行执行外，多个`CompletableFuture`还可以并行执行

### 常见的几个方法

#### 任务完成的回调，触发下一个任务

+ `thenAccept()`同步，回调方法无返回值，接受上一个任务的返回值
+ thenAcceptAsync 异步，回调方法无返回值，接受上一个任务的返回值
+ thenApply 同步，回调方法有返回值，接受上一个任务的返回值
+ thenApplyAsync 异步，回调方法有返回值，接受上一个任务的返回值
+ thenRun 同步，不接受上个任务的返回值，也不返回参数
+ thenRunAsync 异步，不接受上个任务的返回值，也不返回参数

#### 异常处理

+ `exceptionally()`处理异常结果；
+ `whenComplete`可以在任务完成时触发回调函数，无论是正常完成还是发生异常。通过在`whenComplete`方法中处理异常。

#### 任务编排处理

+ `thenApplyAsync()`用于串行化另一个`CompletableFuture`；
+ `anyOf()`和`allOf()`用于并行化多个`CompletableFuture`，`anyOf()`可以实现"任意个`CompletableFuture`只要一个成功"，`allOf()`可以实现"所有`CompletableFuture`都必须成功"。

### 异常处理

#### exceptionally方法处理异常

捕获异常，处理异常，并返回一个[默认值](https://so.csdn.net/so/search?q=%E9%BB%98%E8%AE%A4%E5%80%BC&spm=1001.2101.3001.7020)或执行其他操作

```java
CompletableFuture<String> result = future.exceptionally(ex -> {
    System.out.println("Error occurred: " + ex); // 异常处理，并且返回一个值
    return "Default Value";
});

```

#### whenComplete方法处理异常

`whenComplete`方法可以在任务完成时触发回调函数，无论是正常完成还是发生异常。通过在`whenComplete`方法中处理异常

```java
CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
    throw new RuntimeException("Oops!");
});

CompletableFuture<String> result = future.thenApply(i -> "Success: " + i)
        .whenComplete((res, ex) -> {
            if (ex != null) {
                System.out.println("Error occurred: " + ex);
            }
        });

result.join(); // 此处会输出错误信息

```

#### handler方法处理异常

`handle`方法可以用于处理异常，并根据需要返回一个新的结果。与`exceptionally`方法不同的是，`handle`方法可以处理正常的返回结果和异常，并返回一个新的结果，`exceptionally`只有在异常的时候才会触发回调

```java
CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
    throw new RuntimeException("Oops!");
});

CompletableFuture<String> result = future.handle((res, ex) -> {
    if (ex != null) {
        System.out.println("Error occurred: " + ex);
        return "Default Value";
    } else {
        return "Success: " + res;
    }
});

result.join(); // 此处会返回默认值

```

### 任务之间如何依赖编排

+ `thenAccept()`同步，回调方法无返回值，接受上一个任务的返回值
+ thenAcceptAsync 异步，回调方法无返回值，接受上一个任务的返回值
+ thenApply 同步，回调方法有返回值，接受上一个任务的返回值
+ thenApplyAsync 异步，回调方法有返回值，接受上一个任务的返回值
+ thenRun 同步，不接受上个任务的返回值，也不返回参数
+ thenRunAsync 异步，不接受上个任务的返回值，也不返回参数

### 有哪几种提交方式

#### runAsync

直接提交任务，没有返回值

#### supplyAsync

提交任务，返回一个Future 有返回值的task

### 如何实现任务的等待机制

#### allOf+ join

等待所有任务完成，继续执行主线程。

### 使用建议

+ 有任务编排
    - 需要返回值
        * thenApply 同步
        * thenApplyAsync 异步
    - 不需要返回值
        * thenAccept 同步
        * thenAcceptAsync 异步
    - 不依赖上个任务
        * thenRun 同步
        * thenRunAsync 异步
+ 异常处理
    - exceptionAlly 处理异常，并返回一个默认值（优先使用这个）
    - handler 处理异常，并返回一个默认值
    - whenComplete 处理异常
+ 存在任务完成回调
    - handler
    - whenComplete，优先这个
+ 对任务返回结果额外处理
    - handler
    - whenComplete
