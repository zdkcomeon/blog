---
title: 单元测试
date: '2023-6-25'
categories:
 - 技术分享
tags:
 - Java
---

:::tip 为何有此篇
平常每写一个方法都是需要经过测试，达到覆盖率才可以提交代码。但是如何写？针对不同层次的方法有如何测试？使用哪些测试方法？等都是需要考虑的问题。
:::

## Http接口（controller）测试

## 普通方法（service）测试

## 数据库接口（mapper）测试

## 注意事项

## Mockio

### 非静态方法测试

### 静态方法测试
::: tip mockIo不支持静态方法测试打桩
因为Mockito使用继承的方式实现mock的，用CGLIB生成mock对象代替真实的对象进行执行，为了mock实例的方法，你可以在subclass中覆盖它，而static方法是不能被子类覆盖的，所以Mockito不能mock静态方法。但PowerMock可以mock静态方法，因为它直接在bytecode上工作。
:::

### 假成功 假失败测试

## 参考文献

- [假成功 假失败测试](https://blog.51cto.com/u_15252276/5027123)
- [单元测试](https://pdai.tech/md/develop/ut/dev-ut-x-mockito.html)