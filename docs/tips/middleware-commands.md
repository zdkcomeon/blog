---
title: 常用中间件指令
description: 记录 Arthas 启动、类加载器排查、方法耗时分析、Java Agent 启动和 Git 常用命令。
date: 2026-10-09
category:
  - 实践笔记
tag:
  - Arthas
  - Java
  - Java Agent
  - Git
  - 指令速查
---

整理日常排查与开发中常用的 Arthas、Java Agent 和 Git 指令，方便随用随查。

## Arthas

### 启动

以下安装命令适用于 Debian / Ubuntu 环境，运行 Arthas 前需准备好 Java 环境。

```bash
apt-get update
apt-get install curl -y
curl -O https://arthas.aliyun.com/arthas-boot.jar
java -jar arthas-boot.jar
```

启动后，按提示选择需要诊断的 Java 进程。

### 类加载器有关

查看指定类的详细信息，包括类来源、父类、加载该类的 ClassLoader 和 `classLoaderHash`：

```text
sc -d 类全路径
```

按类加载器实例查看统计信息：

```text
classloader -l
```

查看所有类加载器的继承树：

```text
classloader -t
```

`sc` 用于查询已加载的类；查看类加载器继承树使用 `classloader -t`。参考：[sc 文档](https://arthas.aliyun.com/doc/sc.html)、[classloader 文档](https://arthas.aliyun.com/doc/classloader.html)。

### 检测方法执行时间

跟踪方法内部调用路径，并查看各调用节点的耗时：

```text
trace 全类名 方法名
```

## Java Agent 启动

```bash
java -jar sql-trace-agent.jar serviceName=dev1-claim,pid=0,ke2=value2
```

## Git

### 合并多次提交

交互式整理最近 3 次提交：

```bash
git rebase -i HEAD~3
```

保留第一条提交为 `pick`，将后续需要合并的提交改为 `squash` 或 `fixup`，保存退出。

### 贮存修改

参考：[git-stash 用法小结 - Tocy - 博客园](https://www.cnblogs.com/tocy/p/git-stash-reference.html)。

| 指令 | 用途 |
| --- | --- |
| `git stash list` | 查看已经贮存的列表。 |
| `git stash` | 直接贮存，使用默认信息。 |
| `git stash push -m "msg"` | 贮存修改并附带说明；旧写法为 `git stash save "msg"`。 |
| `git stash pop` | 应用最新的一条 stash，应用成功后将其从列表中删除；发生冲突时会保留。 |
| `git stash apply` | 应用最新的一条 stash，但不删除 stash，可重复应用。 |
| `git stash drop` | 删除最新的一条 stash，不应用修改；可指定 stash 名称。 |
| `git stash clear` | 删除所有贮存的 stash。 |

指定 stash 时，将 `git stash list` 中的名称作为参数，例如：

```bash
git stash apply 'stash@{1}'
git stash drop 'stash@{1}'
```
