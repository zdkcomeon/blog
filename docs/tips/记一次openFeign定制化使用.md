---
title: 记一次openFeign的定制化配置
date: '2024-03-18'
categories:
 - 技术分享
tags:
 - Java
 - Feign
 - Rpc
---

::: tip 背景
营销系统，老业务升级新的的系统，设计音频图像生成，需要对接第三方服务提供商，之前的老业务系统使用**okHttp**直接调用，升级为新的后，需要使用openFeign统一完成封装调用，但是需要给地第三方上代理访问，加auth token，密钥等，直接替换有点麻烦，还不能影响内部的feign的使用，内部feign使用**httpClent5**基于这个需求，进行分析。
:::
# openFeign介绍
# 技术问题分析
# 解决方案
# 技术分析