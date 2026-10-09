---
title: 关于作者
description: 满觉陇的技术栈、能力与作品集，涵盖 Java 后端、工程效率工具和问题排查实践。
article: false
sidebar: false
breadcrumb: false
pageInfo: false
contributors: false
lastUpdated: false
editLink: false
prev: false
next: false
---

<div class="author-profile">

![满觉陇的头像](/logo.png)

<div class="author-profile-summary">

**满觉陇**

专注 Java 后端开发、工程效率工具与技术实践记录。

</div>

</div>

你好，我是满觉陇。我关注后端服务如何实现、开发环境如何配置，以及系统出现问题时如何找到原因。日常会把重复的操作整理成工具，把解决问题的过程写成文档，让经验能够复用，也方便回头验证和改进。

## 技术栈

| 方向 | 技术与工具 | 实践内容 |
| --- | --- | --- |
| Java 后端 | Java、Spring、Spring Boot、Spring Cloud | 服务开发、组件协作与初始化流程分析。 |
| 数据访问与中间件 | MySQL、MyBatis、Redis、Redisson、Kafka | 数据访问、业务锁封装与消息发送问题分析。 |
| 服务集成 | OpenFeign、Apache HttpClient 5、HTTP | 第三方客户端配置、连接池隔离、代理与超时处理。 |
| 测试验证 | JUnit 5、Mockito、MockMvc | 分层测试、接口校验与异常边界验证。 |
| 问题诊断 | jstack、Arthas | 线程栈分析、方法耗时跟踪与缓存问题排查。 |
| 构建与开发环境 | Maven、Gradle、JDK、Git、IntelliJ IDEA | 构建配置、版本匹配、编译验证与开发工具配置。 |
| 效率工具 | JavaScript、Node.js、HTML、CSS、uTools | 本地文件处理、搜索交互与插件开发。 |
| 文档与自动化 | Markdown、AI 编码技能、VuePress、Vite、GitHub Actions | 项目初始化流程整理、技术文档维护与静态站点构建发布。 |

## 具备的能力

- **后端开发与服务集成**：围绕 Spring 生态组织业务代码，处理 HTTP 客户端配置、依赖协作和服务调用中的异常情况。
- **开发流程自动化**：将环境检查、构建参数配置、JDK 检测和编译验证整理成可重复执行的流程，减少手动配置。
- **工具与插件开发**：结合 JavaScript、Node.js 和 uTools，把文件搜索、筛选与结果整理做成可直接使用的工具。
- **质量验证与技术表达**：通过分层测试检查正常、异常和边界场景，并用代码示例、验证步骤和调查记录说明实现依据。
- **性能分析与优化**：按调用阶段比较耗时，结合方法跟踪、SQL 次数与缓存行为定位瓶颈，再通过测试环境验证优化效果。

## 擅长的方向

- **结合证据排查问题**：从日志、线程栈和执行时序分析阻塞、死锁与类加载问题，区分现象、触发条件和根本原因。
- **关注配置的作用范围**：分析连接池、线程上下文、懒加载和框架默认配置的影响，避免局部调整影响其他调用。
- **将经验整理为可复用成果**：把重复操作沉淀为技能包与插件，把排查过程整理为能够查阅、复现和继续完善的文档。

## 作品集

### init-workspace · Java 项目初始化技能包

面向 AI 编码工具的 Java 项目环境初始化技能包，为已有 Maven 或 Gradle 项目整理构建配置、JDK 选择、编译验证与项目说明。适合接手项目、准备本地开发环境，或统一 AI 编码工具执行项目构建的方式。

**技术组成**：Maven、Gradle、JDK、Markdown、AI 编码技能。

**主要功能**：

- 提供 `init-jm` 和 `init-jg` 两个技能，分别处理 Maven 与 Gradle 项目。
- 按项目校验、构建配置、JDK 检测、编译验证、文档更新和 Git 配置六个步骤组织流程，支持重复执行。
- 从构建文件解析目标 Java 版本，检查本机 JDK，并将版本约束与编译命令记录到项目的 `AGENTS.md`。

这个项目体现了我将开发环境配置整理为标准流程、为 AI 编码工具提供明确执行约束的实践。[查看项目说明与源码](https://github.com/zdkcomeon/init-workspace)。

### FindAnyThingsInFiles · uTools 文件内容搜索插件

用于在指定目录及其子目录中批量搜索文本内容的 uTools 插件，适合查找代码调用、日志关键词和配置项，并将搜索结果整理为可保存的文档。

**技术组成**：原生 JavaScript、HTML、CSS、Node.js、文件系统模块与 uTools 插件接口。

**主要功能**：

- 支持全文搜索、按文件后缀筛选和自定义后缀，排除常见二进制文件类型。
- 显示搜索进度与统计信息，识别文件所属项目，并保存上次使用的搜索目录。
- 将项目名、文件名、文件类型、行号和匹配内容导出为 Markdown 表格，支持打开结果文件或所在目录。

当前面向 UTF-8 文本文件搜索。这个项目体现了我围绕实际检索需求完成交互设计、本地文件处理和结果导出的能力。[查看项目说明与源码](https://github.com/zdkcomeon/FindAnyThingsInFiles)。

### 可爱团子随记 · 学习与实践知识库

以 Java 后端开发为主线，持续整理学习资料、工具配置、编码实践和故障调查。通过专题导航、分类、标签、时间线与全文搜索，让不同类型的内容更容易查找。

**技术组成**：VuePress 2、VuePress Theme Hope、Vue、Vite、Markdown、GitHub Actions 与 GitHub Pages。

**主要内容**：

- [学习资源](../learningResource/)：Java、MySQL、计算机网络、操作系统与 Spring 生态的学习和复习入口。
- [开发工具](../softwareInstallation/)：开发环境安装、版本管理与日常工具配置。
- [实践笔记](../tips/)：测试、服务集成、编码技巧和问题排查记录。

这个作品体现了我组织知识、维护技术文档和配置静态站点构建发布流程的实践。

### 工程实践文档 · 服务集成、测试与性能排查

围绕具体问题分别记录背景、分析依据、实现思路和验证方式，保留能够继续追查的技术细节。

- **[OpenFeign 定制配置](../tips/记一次openFeign定制化使用.md)**：针对第三方接口单独配置 Apache HttpClient 5 客户端，说明连接池、代理、授权、超时和重试的作用范围，以及如何验证内部客户端不受影响。
- **[Java 分层测试](../tips/unitTest.md)**：整理 JUnit 5、Mockito、MockMvc 与 MyBatis 测试示例，分别说明业务逻辑、HTTP 契约和真实 SQL 的验证方式，覆盖正常、异常与边界场景。
- **[Kafka 类加载故障调查](../tips/kafka-string-serializer.md)**：分析公共线程池首次发送消息时的序列化类加载失败，结合线程上下文类加载器与延迟初始化解释触发条件和修复边界。
- **[Spring 启动死锁调查](../tips/outbound-startup-deadlock.md)**：结合 `jstack` 确认 Spring 单例注册表锁与监控依赖懒加载锁的相互等待，梳理启动时序和两种修复思路。
- **[Spring 循环依赖调查](../tips/notice-startup-circular-dependency.md)**：还原消息消费者与生产者的依赖环，分析异步代理和早期引用不一致的原因，并记录注入点懒加载的修复方式。
- **[出单性能调查与优化](../tips/policy-issuance-performance.md)**：通过阶段日志、Arthas 方法跟踪和 SQL 次数分析，定位商品配置重复查询与缓存周期性失效，整理分阶段优化及测试环境验证结果。
