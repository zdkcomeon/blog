---
title: OpenFeign 定制配置
description: 记录第三方接口接入时，OpenFeign 客户端、代理与授权请求头的配置需求。
date: 2024-03-18
category:
- 实践笔记
tag:
- Spring Cloud
- OpenFeign
- HTTP
---

::: tip 背景
营销系统，老业务升级新的的系统，设计音频图像生成，需要对接第三方服务提供商，之前的老业务系统使用`okhttp`直接调用，升级为新的后，需要使用openFeign统一完成封装调用，但是需要给地第三方上代理访问，加auth token，密钥等，直接替换有点麻烦，还不能影响内部的feign的使用，内部feign使用`httpClient5`基于这个需求，进行分析，设计。
:::
## openFeign介绍
&nbsp;&nbsp;&nbsp;&nbsp;**springCloud**微服务的一个组件，多用于内部服务之间的远程调用，其实就是RPC的一个实现，底层采用httpClent5或者okhttp实现调用,发起请求
## 需求分析
- 原本是使用okhttp调用，现在改成feign，不支持`okhttp`链接池，技术强要求使用`httpClient5`
- feign 如何配置实现远程调用第三方服务接口
- feign 如何配置代理
- feign 如何支持切换代理模式，即支持代理，又可以不支持代理
- feign 如何统一设置授权请求头（既然都使用feign了，不再使用okhttp原生调用了，尝试统一简化一下流程，做一个无感授权）
- 如何给这个第三方的feign接口配置一个单独的客户端，单独的配置，不影响其他feign的配置，其实就是feign的配置隔离
## 尝试分析
### 确定系统中连接池配置
为啥我说我们技术强要求使用`httpClient5`，这是我研究出来的结果
1. 搜素feign的链接池配置
2. 搜索相关依赖项
3. 确定链接池
### 如何为feign单独配置
查看官网介绍，发现有个配置项需要开启
### 如何为feign配置代理
确定一个方案，代理的指定是在创建网络的时候就要指定的，不能在发起请求时，指定
### 如何为feign配置请求头
使用拦截器
## 确定方案
## 技术分析