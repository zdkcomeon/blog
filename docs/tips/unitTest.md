---
title: 单元测试
star: true
description: 用 JUnit 5、Mockito、MockMvc 和 MyBatis 测试切片验证 Controller、Service、Mapper，覆盖正常、异常、边界与静态方法场景。
date: 2023-06-25
category:
- 实践笔记
tag:
- Java
- 单元测试
- Mockito
---

::: tip 为何有此篇
代码需要经过测试，但“方法执行过了”和“行为验证正确了”是两回事。测试不仅要覆盖正常结果，还要检查异常、边界条件以及不应发生的副作用。本文以一个用户查询和创建功能为例，说明不同层次应该验证什么、哪些依赖可以 Mock，以及如何避免没有验证业务行为的测试。
:::

## 版本与测试范围

示例采用 **Java 17、Spring Boot 3.2.x、JUnit Jupiter（JUnit 5）、Mockito 5.x、MyBatis Starter 3.0.3**，使用 Maven 和 Spring Boot parent 管理依赖。它用于现有 Spring Boot 3 项目的测试实践，不代表最新版本。

代码使用 Boot 3.2 的 `@MockBean`。在 Boot 3.4 / Spring Framework 6.2 及以上项目中，可以按对应版本文档迁移到 `@MockitoBean`，不要在旧版本中直接替换导入。

| 测试对象 | 主要验证内容 | 依赖与工具 | 测试性质 |
| --- | --- | --- | --- |
| 普通方法 / Service | 业务分支、返回值、异常与副作用 | 真实被测对象，Mockito 替换 Mapper / 远程客户端 | 纯单元测试，无需启动 Spring |
| Controller | URL 映射、JSON、参数校验、状态码、异常转换 | `@WebMvcTest` + MockMvc，替换 Service | MVC 切片测试 |
| Mapper | SQL、字段映射、约束、增删改查 | `@MybatisTest` + 测试数据库 | 数据访问集成测试 |
| 完整应用 | 多层协作、自动配置、事务和过滤器 | `@SpringBootTest`，必要时启动测试容器 | 应用集成测试 |

Controller 和 Mapper 测试都可以纳入项目的自动化测试，但它们与纯单元测试的边界不同。不要为每个普通业务方法都加载完整 Spring 上下文，也不要 Mock Mapper 后声称验证了 SQL。

### 依赖与目录

已有 Web 项目通常只需补测试依赖；下面是示例需要的基础依赖片段。Boot parent 示例版本为 3.2.12，版本号由其统一管理。

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

`spring-boot-starter-test` 包含 JUnit Jupiter、Mockito、AssertJ 和 Spring Test。测试类使用 `org.junit.jupiter.api.Test`；JUnit 5 不需要 JUnit 4 的 `@RunWith`。

```text
src/main/java/com/example/user/       # 被测业务代码
src/test/java/com/example/user/       # *Test.java
src/test/resources/sql/              # 测试 SQL
```

下面的业务类和测试类都使用 `com.example.user` 包，每个 public 类型分别存入同名文件。项目还需要在 `com.example` 或其上层包中有常规 `@SpringBootApplication` 启动类，供 MVC 和 MyBatis 测试查找应用配置。

## 普通方法（Service）测试

### 准备被测对象

约定：查询不存在的用户时抛出业务异常；创建用户时去掉名称首尾空白，拒绝空名称和重复名称；数据库写入必须影响一行。

`User.java`：

```java
package com.example.user;

public record User(Long id, String name) {
}
```

两个业务异常分别保存为 `UserNotFoundException.java` 和 `DuplicateUserException.java`：

```java
package com.example.user;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(long id) {
        super("用户不存在：" + id);
    }
}
```

```java
package com.example.user;

public class DuplicateUserException extends RuntimeException {
    public DuplicateUserException(String name) {
        super("用户名称已存在：" + name);
    }
}
```

`UserService.java`，使用构造器注入。`UserMapper` 的完整接口见后面的 Mapper 章节。

```java
package com.example.user;

import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserMapper userMapper;

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public User findById(long id) {
        User user = userMapper.findById(id);
        if (user == null) {
            throw new UserNotFoundException(id);
        }
        return user;
    }

    public void create(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("用户名称不能为空");
        }
        String normalizedName = name.trim();
        if (userMapper.findByName(normalizedName) != null) {
            throw new DuplicateUserException(normalizedName);
        }
        if (userMapper.insert(normalizedName) != 1) {
            throw new IllegalStateException("用户写入失败");
        }
    }
}
```

查重与写入之间仍可能出现并发竞争，因此数据库也需要唯一约束；这由 Mapper 测试验证。示例用于展示测试边界，实际业务可统一转换数据库重复键异常。

### 验证正常、异常和边界行为

`UserServiceTest.java`：

```java
package com.example.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldReturnExistingUser() {
        // Arrange：准备依赖返回值
        when(userMapper.findById(1L)).thenReturn(new User(1L, "小明"));

        // Act：调用真实的被测对象
        User result = userService.findById(1L);

        // Assert：检查业务结果
        assertThat(result).isEqualTo(new User(1L, "小明"));
    }

    @Test
    void shouldThrowWhenUserDoesNotExist() {
        when(userMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> userService.findById(99L))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void shouldTrimNameBeforeInsert() {
        when(userMapper.insert("小明")).thenReturn(1);

        userService.create("  小明  ");

        verify(userMapper).findByName("小明");
        ArgumentCaptor<String> nameCaptor = ArgumentCaptor.forClass(String.class);
        verify(userMapper).insert(nameCaptor.capture());
        assertThat(nameCaptor.getValue()).isEqualTo("小明");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t"})
    void shouldRejectBlankNameWithoutAccessingDatabase(String name) {
        assertThatThrownBy(() -> userService.create(name))
                .isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(userMapper);
    }

    @Test
    void shouldNotInsertDuplicateName() {
        when(userMapper.findByName("小明")).thenReturn(new User(1L, "小明"));

        assertThatThrownBy(() -> userService.create("小明"))
                .isInstanceOf(DuplicateUserException.class);

        verify(userMapper, never()).insert(anyString());
    }
}
```

`MockitoExtension` 初始化 Mock 并检查无用打桩。`@InjectMocks` 创建真实 Service、注入 Mock 依赖，它不会启动 Spring，也不会自动提供事务、缓存或 AOP 代理。需要验证这些框架行为时，另写集成测试。

## HTTP 接口（Controller）测试

直接调用 `controller.findById(1L)` 无法检查路由、JSON 转换和参数校验。MockMvc 会通过 Spring MVC 的处理流程发起模拟请求，同时无需启动真实 HTTP 端口。

### 定义 Controller 和异常响应

`CreateUserRequest.java`：

```java
package com.example.user;

import jakarta.validation.constraints.NotBlank;

public record CreateUserRequest(@NotBlank String name) {
}
```

`UserController.java`：

```java
package com.example.user;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public User findById(@PathVariable("id") long id) {
        return userService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@Valid @RequestBody CreateUserRequest request) {
        userService.create(request.name());
    }
}
```

`UserExceptionHandler.java`，把业务异常转换成稳定的状态码和错误码：

```java
package com.example.user;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class UserExceptionHandler {
    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> handleNotFound(UserNotFoundException exception) {
        return Map.of("code", "USER_NOT_FOUND", "message", exception.getMessage());
    }

    @ExceptionHandler(DuplicateUserException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> handleDuplicate(DuplicateUserException exception) {
        return Map.of("code", "DUPLICATE_USER", "message", exception.getMessage());
    }
}
```

### 使用 MVC 切片测试

`UserControllerTest.java`：

```java
package com.example.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import(UserExceptionHandler.class)
class UserControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void shouldReturnUserJson() throws Exception {
        when(userService.findById(1L)).thenReturn(new User(1L, "小明"));

        mockMvc.perform(get("/users/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("小明"));
    }

    @Test
    void shouldMapMissingUserTo404() throws Exception {
        when(userService.findById(99L)).thenThrow(new UserNotFoundException(99L));

        mockMvc.perform(get("/users/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void shouldCreateUser() throws Exception {
        mockMvc.perform(post("/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"小明\"}"))
                .andExpect(status().isCreated());

        verify(userService).create("小明");
    }

    @Test
    void shouldRejectBlankNameBeforeCallingService() throws Exception {
        mockMvc.perform(post("/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(userService);
    }
}
```

这里 Mock 的是 Service，Controller 和 MVC 校验流程是真实的。业务逻辑已经在 Service 测试中验证，Controller 测试重点检查 HTTP 契约。根据接口再补畸形 JSON、缺失字段、路径参数类型错误、409 等场景；默认校验错误的正文可能随配置变化，只有约定了错误格式才对其字段做固定断言。

如果项目引入 Spring Security，`@WebMvcTest` 中的过滤器可能要求认证和 CSRF。添加 `spring-security-test`，结合项目的安全配置使用 `@WithMockUser` 和 `csrf()`，并单独验证未登录、权限不足等行为。不要为了让测试通过，直接把过滤器全部关闭后宣称认证逻辑已覆盖。

需要验证多个层次一起运行时，使用 `@SpringBootTest` 配合 `@AutoConfigureMockMvc`；需要真实端口时使用 `webEnvironment = RANDOM_PORT`。这两种范围不同，不需要叠加 `@WebMvcTest`。

## 数据库接口（Mapper）测试

Mapper 的价值在于执行正确 SQL 和映射真实结果。Mock Mapper 适合隔离 Service，但不能发现列名、SQL 方言、唯一约束或结果映射的问题。

### 依赖与 SQL

在基础依赖之外添加 MyBatis 与测试数据库，生产 starter 和测试 starter 使用同一版本：

```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>3.0.3</version>
</dependency>
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter-test</artifactId>
    <version>3.0.3</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

`UserMapper.java`：

```java
package com.example.user;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper {
    @Select("SELECT id, name FROM app_user WHERE id = #{id}")
    User findById(@Param("id") long id);

    @Select("SELECT id, name FROM app_user WHERE name = #{name}")
    User findByName(@Param("name") String name);

    @Insert("INSERT INTO app_user(name) VALUES(#{name})")
    int insert(@Param("name") String name);
}
```

`src/test/resources/sql/users.sql` 在每个用例前重建测试表和数据：

```sql
DROP TABLE IF EXISTS app_user;
CREATE TABLE app_user (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE
);
INSERT INTO app_user(name) VALUES ('小明'), ('小红');
```

该脚本只用于隔离的测试数据库。这里演示 H2 的建表语法；生产数据库的迁移脚本应在对应数据库环境中验证。

### 执行真实 Mapper

`UserMapperTest.java`：

```java
package com.example.user;

import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.test.context.jdbc.Sql;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@MybatisTest
@Sql("/sql/users.sql")
class UserMapperTest {
    @Autowired
    private UserMapper userMapper;

    @Test
    void shouldMapExistingUser() {
        assertThat(userMapper.findById(1L)).isEqualTo(new User(1L, "小明"));
    }

    @Test
    void shouldReturnNullForMissingUser() {
        assertThat(userMapper.findById(99L)).isNull();
    }

    @Test
    void shouldPersistNewUser() {
        assertThat(userMapper.insert("小李")).isEqualTo(1);
        assertThat(userMapper.findByName("小李").name()).isEqualTo("小李");
    }

    @Test
    void shouldEnforceUniqueName() {
        assertThatThrownBy(() -> userMapper.insert("小明"))
                .isInstanceOf(DuplicateKeyException.class);
    }
}
```

`@MybatisTest` 配置 Mapper 和 MyBatis 基础设施，默认使用可用的内存数据库，测试中的事务性写入默认回滚；普通 Service 不会自动加载。上述脚本每次重建表，避免用例依赖执行顺序。DDL 的事务行为由数据库决定，不能假设建表、序列变化或所有数据库操作都会随测试回滚。

H2 适合快速检查基础 SQL 和映射，但兼容模式不能完全模拟 MySQL / PostgreSQL 的 JSON、排序规则、锁和方言。涉及这些特性时，用 Testcontainers 启动与生产同类型的数据库，运行真实迁移脚本，并使用 `@AutoConfigureTestDatabase(replace = NONE)` 保留容器数据源。外部测试库同样必须独立，避免让重建表脚本连接到开发共享库或生产库。

如果使用 XML Mapper，配置相应的 `mybatis.mapper-locations`，并验证动态 SQL 条件、分页、空集合和参数绑定。MyBatis-Plus 项目应按其对应版本的测试支持配置，不能直接把所有自动配置等同于纯 MyBatis。

## Mockito 常用方法

### 非静态方法、Mock 与 Spy

| 写法 | 作用与边界 |
| --- | --- |
| `when(mock.call()).thenReturn(value)` | 模拟依赖的返回值 |
| `when(mock.call()).thenThrow(exception)` | 模拟依赖抛出异常 |
| `doThrow(exception).when(mock).voidCall()` | 对 void 方法模拟异常 |
| `verify(mock).call()` | 检查有业务意义的副作用，默认一次 |
| `verify(mock, never()).call()` | 检查某操作没有发生 |
| `ArgumentCaptor` | 捕获依赖实际收到的参数并断言 |
| `spy(realObject)` | 保留真实行为，只替换部分方法；未打桩方法仍会执行 |

使用 Spy 时，`when(spy.call())` 会在打桩时执行真实方法。可能产生副作用或提前抛异常时，改用 `doReturn(value).when(spy).call()`。新代码优先拆分清晰的依赖，减少部分 Mock。

使用参数匹配器时，同一次调用的所有参数都要使用匹配器。例如双参数方法使用 `eq(id), anyString()`，不要混用普通参数和匹配器。`anyString()` 不匹配 null；需要 null 时使用 `isNull()` 或对应的 nullable 匹配器。用具体值能说明业务条件时，优先使用具体值。

`@Mock` 创建的是测试类字段，`@MockBean` 替换的是 Spring 上下文中的 Bean。在 MVC 切片中仅声明 `@Mock`，不会自动把它注入 Controller。

### 静态方法测试

::: tip 修正旧说明
“Mockito 不支持静态方法”只适用于旧版本或不支持该能力的 MockMaker。Mockito 从 3.4.0 开始提供 `mockStatic`，3.x / 4.x 需要启用 inline MockMaker（例如匹配版本的 `mockito-inline`）；Mockito 5 默认使用 inline MockMaker，通常只需 `mockito-core`。不要把 Mockito 的实现概括为 CGLIB 继承。
:::

假设遗留代码的订单编号依赖静态 ID 工具。下面两个类型分别保存到同名文件：

```java
package com.example.user;

import java.util.UUID;

public final class LegacyIds {
    private LegacyIds() {
    }

    public static String next() {
        return UUID.randomUUID().toString();
    }
}
```

```java
package com.example.user;

public class OrderNumberService {
    public String nextNumber() {
        return "ORDER-" + LegacyIds.next();
    }
}
```

`OrderNumberServiceTest.java` 使用 try-with-resources 限制静态 Mock 的生命周期：

```java
package com.example.user;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mockStatic;

class OrderNumberServiceTest {
    @Test
    void shouldUseGeneratedIdInOrderNumber() {
        OrderNumberService service = new OrderNumberService();

        try (MockedStatic<LegacyIds> ids = mockStatic(LegacyIds.class)) {
            ids.when(LegacyIds::next).thenReturn("fixed-id");

            assertThat(service.nextNumber()).isEqualTo("ORDER-fixed-id");
            ids.verify(LegacyIds::next);
        }
    }
}
```

静态 Mock 只对创建它的线程生效，不能假设线程池或异步任务也使用同一打桩；未关闭会污染同一线程的后续测试。尽量 Mock 自己的遗留工具类，避免依赖 JDK 核心类的静态 Mock。对新设计，优先注入 `Clock`、ID 生成器或其他可替换依赖。

### “假成功”“假失败”：模拟依赖，验证业务

这里的“假”指依赖环境由测试控制，被测 Service 应当真实执行。不要把被测方法本身 Mock 掉，然后只检查 Mock 返回了预设值。

以下用例放入前面的 `UserServiceTest`。成功写入已由 `shouldTrimNameBeforeInsert` 覆盖；这里补充返回失败与抛出异常两种情况：

```java
@Test
void shouldFailWhenInsertAffectsNoRows() {
    when(userMapper.insert("小明")).thenReturn(0);

    assertThatThrownBy(() -> userService.create("小明"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("用户写入失败");
}

@Test
void shouldPropagateDatabaseFailure() {
    when(userMapper.insert("小明"))
            .thenThrow(new org.springframework.dao.DataAccessResourceFailureException(
                    "测试数据库不可用"));

    assertThatThrownBy(() -> userService.create("小明"))
            .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);
}
```

这些用例验证依赖失败后业务不会返回成功。若真实逻辑包含补偿、重试或降级，还应验证补偿发生的条件、最大调用次数和最终结果；仅使用连续 `thenThrow(...).thenReturn(...)`，不会让被测代码自动具备重试行为。

## 注意事项与覆盖清单

| 场景 | 建议验证 |
| --- | --- |
| 正常输入 | 返回值或持久化结果符合约定 |
| 空、null、空白和临界值 | 明确接受 / 拒绝，拒绝时不产生副作用 |
| 数据不存在 / 重复 | 业务异常、HTTP 状态或唯一约束符合约定 |
| 依赖失败 | 异常传播、补偿、降级或重试次数正确 |
| 时间和随机值 | 注入固定时钟或可控生成器，避免偶发失败 |
| 事务与并发 | 在真实代理和对应数据库中验证回滚、锁和幂等 |

- 每个用例按 Arrange、Act、Assert 组织，名称表达输入条件和预期行为。用小而明确的数据，不依赖测试执行顺序。
- 保持被测对象真实，只替换外部依赖。纯值对象和简单集合通常无需 Mock。
- 不要用 `try/catch` 吞掉异常后让测试结束；使用异常断言，保证“必须抛异常”也被检查。
- 行覆盖率只能说明代码经过执行。对关键分支、异常类型和副作用做断言，避免只有调用没有断言的测试。
- 不要为了消除无用打桩警告，把整个测试类设为 lenient；把打桩放到真正需要它的用例中。`verifyNoMoreInteractions` 也不必出现在每个测试里，只验证业务关心的交互。
- Spring 测试事务绑定到当前线程。真实 HTTP 服务器、异步线程或独立事务中的写入，不一定随测试线程回滚，需要单独清理数据。
- 调用第三方服务使用桩服务，不依赖真实 Token、网络和计费接口。需要验证请求头与客户端隔离时，可结合 [OpenFeign 定制配置](./记一次openFeign定制化使用.md)。

## 运行与常见问题

在包含上述 Java 示例的 Maven 项目中执行：

```bash
mvn test
mvn -Dtest=UserServiceTest test
mvn -Dtest=UserControllerTest,UserMapperTest test
```

本博客仓库只保存文档，没有 Java 示例工程；这些命令用于业务项目，博客自身的校验命令是 `npm run docs:build`。使用 Boot parent 时，它会管理适合 JUnit 5 的 Surefire 插件；其他项目需要确认插件版本和命名规则，避免构建成功却没有运行测试。

| 问题 | 排查方向 |
| --- | --- |
| Mock 字段为 null | 是否启用 `MockitoExtension`，或把 `@Mock` 与 Spring Bean 注入混用 |
| `UnnecessaryStubbingException` | 是否在公共初始化中打桩了当前用例不会调用的方法 |
| `InvalidUseOfMatchersException` | 同一次调用是否混用匹配器与普通参数 |
| MVC 切片找不到 Service | 使用上下文级的 `@MockBean`，或按需求显式导入依赖 |
| 请求返回 401 / 403 | 检查认证、角色与 CSRF，区分安全过滤器和业务响应 |
| `Unable to find a @SpringBootConfiguration` | 启动类是否位于测试包的上层，是否需要显式指定测试配置 |
| Mapper 找不到表或 XML | 是否加载 SQL 脚本、正确的数据源与 `mapper-locations` |
| 静态 Mock 不生效 | 核对 Mockito 版本、MockMaker，以及调用是否跨线程 |

## 参考资料

- [JUnit 5 用户指南](https://docs.junit.org/5.10.5/user-guide/)：断言、生命周期与参数化测试。
- [Mockito 5.11 API](https://javadoc.io/static/org.mockito/mockito-core/5.11.0/org/mockito/Mockito.html)：普通 Mock、Spy、静态 Mock 和资源释放。
- [Spring Boot 3.2.12 测试文档](https://docs.spring.io/spring-boot/docs/3.2.12/reference/htmlsingle/#features.testing)：测试切片、MockMvc 与 Spring 上下文测试。
- [MyBatis Spring Boot 测试说明](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-test-autoconfigure/)：`@MybatisTest`、版本兼容与测试数据库选择。
