---
title: Spring Boot 启动与 Bean 生命周期
description: 整理 Spring Boot 启动、Bean 定义收集、实例化、属性注入、初始化和销毁。
category:
- 学习资源
tag:
- Java
- Spring Boot
- 知识梳理
---

整理 Spring Boot 启动、Bean 定义收集、实例化、属性注入、初始化和销毁。

## SpringBoot的启动流程

> bean定义收集
>
> 实例化
>
> 初始化
>
> 使用
>
> 销毁
>

[https://blog.csdn.net/weixin_39911567/article/details/111039200](https://blog.csdn.net/weixin_39911567/article/details/111039200)

1. bean定义的收集，ComponentScan组件扫描路径查找
    1. @Bean
    2. spring的bean定义的xml文件
2. 实例化
3. 属性注入
    1. @Autowired依赖注入
    2. @Value属性注入
4. 初始化
    1. 检查Aware接口执行，设置相关的依赖
        1. BeanFactoryAware接口
        2. ApplicationContextAware接口
        3. BeanNameAware接口
        4. EnvironmentAware接口
    2. BeanPostProcess#before接口执行
    3. InitializingBean执行
    4. 执行init-method方法
    5. BeanPostProcess#after后置接口执行
        1. aop的动态代理类创建
5. 销毁
    1. DisposableBean执行
    2. destroy-method方法执行

## Spring 属性如何注入的，Autowired 的原理？

待补充。

## Spring AOP的实现？

Bean的后置处理器，创建对象，初始化Bean完成后，执行Bean的代理对象生成
