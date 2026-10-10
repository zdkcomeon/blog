---
title: Spring 学习入口
description: Spring Framework 官方参考文档及本站依赖注入实践入口。
category:
- 学习资源
tag:
- Java
- Spring
- 学习导航
article: false
pageInfo: false
---

从容器与依赖注入开始，再阅读 AOP、事务和 Web 应用相关章节。

## 官方资料

- [Spring Framework 参考文档](https://docs.spring.io/spring-framework/reference/)
- [Spring 入门指南](https://spring.io/guides)

## 主题笔记

| 文档 | 内容 |
| --- | --- |
| [Spring 容器、FactoryBean 与循环依赖](./container.md) | 整理 BeanFactory、FactoryBean、设计模式、三级缓存和循环依赖。 |
| [Spring 事务传播与多数据源](./transactions.md) | 整理 Spring 事务传播机制、多数据源配置和多数据源事务笔记。 |
| [Spring MVC 请求流程与拦截器](./mvc.md) | 整理 DispatcherServlet、HandlerMapping、HandlerAdapter 和拦截器执行流程。 |

## 本站相关阅读

- [Java 与 Spring 编码技巧](../../../tips/技巧积攒.md)：包含构造器注入的使用记录。
- [单元测试](../../../tips/unitTest.md)：按 Controller、Service、Mapper 分层思考测试。
- [Spring Boot](../SpirngBoot/)：进一步学习应用初始化和配置。
