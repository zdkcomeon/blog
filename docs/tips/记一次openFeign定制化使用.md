---
title: OpenFeign 定制配置
star: true
description: 使用 Apache HttpClient 5 为第三方 OpenFeign 接口隔离连接池、代理、授权、超时与重试配置，并验证内部客户端不受影响。
date: 2024-03-18
category:
- 实践笔记
tag:
- Spring Cloud
- OpenFeign
- HTTP
---

::: tip 背景
营销系统升级时，需要把音频、图像生成等第三方服务调用从直接使用 OkHttp，迁移到统一的 OpenFeign 接口。第三方请求需要代理和授权 Token，内部服务已经使用 Apache HttpClient 5（下文简称 HC5）。目标是在复用同一种 HTTP 实现的同时，为第三方接口建立独立配置，避免影响内部服务调用。
:::

## 适用版本与调用原理

本文示例按 **Java 17、Spring Boot 3.2.x、Spring Cloud 2023.0.x / OpenFeign 4.1.x** 编写，依赖组合示例为 Boot 3.2.12、Cloud 2023.0.4。它用于说明现有项目的接入方式，不代表当前最新版本。接入其他版本时，先核对 [Spring Cloud 版本兼容关系](https://github.com/spring-cloud/spring-cloud-release/wiki/Supported-Versions)。

OpenFeign 是声明式 HTTP 客户端：用接口描述请求，由代理对象完成参数编码、HTTP 发送、响应解码。Spring Cloud OpenFeign 增加了 Spring MVC 注解、服务发现和负载均衡等集成。底层的 `feign.Client` 才负责发送 HTTP 请求，连接池属于 HC5 等具体实现。

```text
业务代码 → MediaClient 接口代理
         → RequestInterceptor 添加第三方授权
         → Encoder 编码 JSON
         → ApacheHttp5Client → 专属 HC5 连接池 → 代理或直连
         → Decoder 解码响应 / ErrorDecoder 处理非成功响应
```

OpenFeign 4.x 不再支持 Apache HttpClient 4。不要把旧文章中的 `feign-httpclient`、`org.apache.http.*` 和 HC5 的 `feign-hc5`、`org.apache.hc.*` 混用。Feign 同样支持 OkHttp；采用 HC5 是本项目的技术约束。

## 需求与方案

| 需求 | 实现方式 |
| --- | --- |
| 第三方使用固定域名 | 在 `@FeignClient` 中指定 `url` |
| 第三方流量独立 | 专属 `Client`、`CloseableHttpClient` 和连接池 |
| 支持代理与直连 | 创建 HC5 客户端时根据配置选择路由 |
| 统一授权 | 专属 `RequestInterceptor` 添加 Bearer Token |
| 内部服务不受影响 | 配置只装入第三方 Feign 子上下文，避免注册为全局配置 |
| 避免内部授权被带到外部 | 关闭第三方客户端对父上下文中相关 Feign 配置的继承 |
| 控制等待与重复提交 | 分别设置连接池等待、连接、读取超时，关闭两层自动重试 |

先确认项目实际使用的实现，再修改配置。仅看到 HC5 依赖，并不能证明所有 Feign 请求都使用它：自定义 `Client`、自动配置条件和 LoadBalancer 包装都会影响最终实例。

```bash
mvn dependency:tree -Dincludes=io.github.openfeign:*,org.apache.httpcomponents.client5:*,com.squareup.okhttp3:*
```

结合自动配置报告或调试查看实际 `Client`；存在 LoadBalancer 时还要查看它的 delegate。

## 配置与实现

### 1. 管理依赖

下面片段放入已有 Maven 项目的 `pom.xml`，前提是使用 Spring Boot 3.2.12 的 parent 或依赖 BOM。Spring Cloud BOM 统一管理 Feign 版本，不要给 `feign-hc5` 单独指定一个不匹配的版本。

```xml
<properties>
    <java.version>17</java.version>
    <spring-cloud.version>2023.0.4</spring-cloud.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>${spring-cloud.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
    <dependency>
        <groupId>io.github.openfeign</groupId>
        <artifactId>feign-hc5</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

在启动类启用 `@EnableFeignClients`，扫描客户端接口所在包。已有 Feign 配置的项目无需重复添加启动配置。

### 2. 外部化配置

`application.yml`：

```yaml
spring:
  cloud:
    openfeign:
      httpclient:
        hc5:
          enabled: true
      okhttp:
        enabled: false

third-party:
  media:
    base-url: ${MEDIA_API_BASE_URL}
    api-token: ${MEDIA_API_TOKEN}
    connect-timeout-millis: 3000
    read-timeout-millis: 60000
    pool-acquire-timeout-millis: 2000
    proxy:
      enabled: ${MEDIA_PROXY_ENABLED:false}
      host: ${MEDIA_PROXY_HOST:127.0.0.1}
      port: ${MEDIA_PROXY_PORT:8080}
```

这里的 HC5、OkHttp 开关与项目原本使用 HC5 的前提一致；它们是全局开关，不能用来只切换某一个客户端。第三方的专属客户端由后面的 Java 配置显式创建。

域名和 Token 由部署环境提供；`api-token` 只存 Token 本体，不带 `Bearer ` 前缀。本文的代理是 HTTP 转发代理，HTTPS 目标通常通过 CONNECT 建立隧道，代理端口和协议以实际服务为准。

`MediaApiProperties.java`，示例包为 `com.example.media`：

```java
package com.example.media;

import java.net.URI;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "third-party.media")
public record MediaApiProperties(
        @NotNull URI baseUrl,
        @NotBlank String apiToken,
        @Min(1) int connectTimeoutMillis,
        @Min(1) int readTimeoutMillis,
        @Min(1) int poolAcquireTimeoutMillis,
        @Valid @NotNull Proxy proxy) {

    public record Proxy(
            boolean enabled,
            @NotBlank String host,
            @Min(1) @Max(65535) int port) {
    }
}
```

### 3. 定义第三方接口

下列路径和字段是演示协议，替换成服务商实际 API。每个 public 类型分别保存到同名文件。

```java
package com.example.media;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "media-provider",
        contextId = "mediaProviderClient",
        url = "${third-party.media.base-url}",
        configuration = MediaFeignConfig.class)
public interface MediaClient {

    @PostMapping(value = "/v1/images", consumes = "application/json")
    ImageResult createImage(@RequestBody ImageCommand command);
}
```

```java
package com.example.media;

public record ImageCommand(String prompt) {
}
```

```java
package com.example.media;

public record ImageResult(String taskId, String status) {
}
```

`name` 是客户端名称；`contextId` 用于区分配置上下文。同一服务商有不同授权或代理需求时，使用不同 `contextId` 和对应配置。这里显式指定 URL，第三方调用不需要通过内部服务注册中心发现地址。

### 4. 为该客户端创建专属配置

`MediaFeignConfig.java` **不加 `@Configuration` 或 `@Component`，也不在主应用中全局 `@Import`**。Spring Cloud 会根据 `@FeignClient(configuration = ...)` 将它装入该客户端的子上下文。若选择加 `@Configuration`，则必须放到主应用扫描范围之外或显式排除扫描。

```java
package com.example.media;

import java.util.concurrent.TimeUnit;
import feign.Client;
import feign.Logger;
import feign.Request;
import feign.RequestInterceptor;
import feign.Retryer;
import feign.hc5.ApacheHttp5Client;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.util.TimeValue;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.clientconfig.FeignClientConfigurer;
import org.springframework.context.annotation.Bean;

@EnableConfigurationProperties(MediaApiProperties.class)
public class MediaFeignConfig {

    @Bean(destroyMethod = "close")
    public CloseableHttpClient mediaHttpClient(MediaApiProperties properties) {
        PoolingHttpClientConnectionManager pool =
                PoolingHttpClientConnectionManagerBuilder.create()
                        .setMaxConnTotal(50)
                        .setMaxConnPerRoute(20)
                        .build();

        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectionRequestTimeout(
                        Timeout.ofMilliseconds(properties.poolAcquireTimeoutMillis()))
                .build();

        HttpClientBuilder builder = HttpClients.custom()
                .setConnectionManager(pool)
                .setDefaultRequestConfig(requestConfig)
                .evictExpiredConnections()
                .evictIdleConnections(TimeValue.ofSeconds(30))
                .disableAutomaticRetries()
                .disableRedirectHandling();

        if (properties.proxy().enabled()) {
            builder.setProxy(new HttpHost(
                    "http", properties.proxy().host(), properties.proxy().port()));
        }
        return builder.build();
    }

    @Bean
    public Client mediaFeignClient(
            @Qualifier("mediaHttpClient") CloseableHttpClient httpClient) {
        return new ApacheHttp5Client(httpClient);
    }

    @Bean
    public Request.Options mediaRequestOptions(MediaApiProperties properties) {
        return new Request.Options(
                properties.connectTimeoutMillis(), TimeUnit.MILLISECONDS,
                properties.readTimeoutMillis(), TimeUnit.MILLISECONDS,
                false);
    }

    @Bean
    public RequestInterceptor mediaAuthInterceptor(MediaApiProperties properties) {
        return template -> {
            template.removeHeader("Authorization");
            template.header("Authorization", "Bearer " + properties.apiToken());
        };
    }

    @Bean
    public Retryer mediaRetryer() {
        return Retryer.NEVER_RETRY;
    }

    @Bean
    public Logger.Level mediaLoggerLevel() {
        return Logger.Level.BASIC;
    }

    @Bean
    public FeignClientConfigurer mediaFeignClientConfigurer() {
        return new FeignClientConfigurer() {
            @Override
            public boolean inheritParentConfiguration() {
                return false;
            }
        };
    }
}
```

这段配置有几个关键点：

- 显式提供 `Client`，保证使用子上下文中的专属 HC5 实例。只在全局注册 `CloseableHttpClient` 会影响自动配置和其他客户端的选择。
- HC5 和连接池作为单例复用，不在每次请求时创建。此处连接管理器由 HC5 持有，未设置共享模式；关闭 HC5 时同时释放连接池和清理线程。
- 拦截器清除已有授权后写入唯一的第三方 Token。不能再给这个客户端挂载其他覆盖授权的拦截器，也不要把内部用户 Token 直接透传到第三方。
- `inheritParentConfiguration() = false` 用于阻止继承父上下文中的拦截器等相关 Feign 配置，**不等于移除整个 Spring 父上下文**。显式配置专属 `Client` 和避免全局扫描仍然必要；放在 `defaultConfiguration` 中的配置仍可能进入子上下文，需要一起检查。

::: warning 配置继承与优先级
在本文核对的 OpenFeign 4.1.4 中，关闭父配置继承后，`configureFeign` 不走通常的客户端属性装配分支。因此不要一边设置 `inheritParentConfiguration() = false`，一边只依赖 `spring.cloud.openfeign.client.config.mediaProviderClient` 中的超时、日志级别或拦截器配置。本文通过专属 Bean 和 `third-party.media` 属性设置它们。

保留继承时，属性配置默认优先于 Java 配置；`spring.cloud.openfeign.client.default-to-properties=false` 可以调整优先级，但这是全局设置。用配置键区分客户端时，本文应匹配 `contextId`：`mediaProviderClient`。原稿提到的“开启一个配置项”并不是隔离配置的必要条件，作用域才是重点。
:::

### 5. 超时、代理切换与授权更新

| 配置 | 控制的阶段 | 示例值 |
| --- | --- | --- |
| `pool-acquire-timeout-millis` | 从连接池租借连接时的等待 | 2 秒 |
| `connect-timeout-millis` | 建立连接 | 3 秒 |
| `read-timeout-millis` | 等待 HTTP 响应的读取超时，由适配器映射到 HC5 | 60 秒 |

这三项不是一次业务调用的总时限。DNS、TLS、响应传输和业务层重试等阶段还需要结合实际版本与调用链设置预算。音频、图像生成若耗时较长，优先采用“创建任务 + 查询状态”的异步协议。

本文核对的 Feign 13.5 HC5 适配器会把 `Request.Options` 的连接、读取超时和重定向设置应用到请求上，同时保留 HC5 默认请求配置中的连接池等待超时。不要只修改 HC5 默认响应超时，却忽略 Feign 自己的 Options。

代理开关和 Token 在客户端创建时读取，**修改环境变量后需要重启应用**；这里没有实现热更新。若业务要求同一时刻既有代理请求又有直连请求，可分别创建两个客户端和连接池，再由业务层选择。HC5 也支持自定义路由规划和请求级配置，因此不能笼统认为代理只能在创建连接时指定；动态方案还需要考虑并发请求的状态隔离。

若 Token 会过期，可把拦截器改为调用一个线程安全的 Token 提供器，负责缓存和提前刷新。不要每个请求都同步访问登录接口，也不要在 401 后无限刷新重试。代理自己的凭据应通过 HC5 的代理认证配置处理，不能用服务商的 `Authorization` 代替。

## 错误处理与重复请求

| 现象 | 处理方向 |
| --- | --- |
| 401 / 403 | 检查 Token、授权格式和权限，区分服务商拒绝与代理拒绝 |
| 407 | 代理要求身份认证，检查代理凭据 |
| 429 | 遵循服务商限流协议和 `Retry-After`，控制并发 |
| 5xx | 记录状态、请求标识与经过脱敏的诊断信息，按业务约定决定重试或降级 |
| 超时 / 连接中断 | 远端可能已经执行，查询任务或使用幂等键确认结果 |

非成功响应默认由 Feign 的 `ErrorDecoder` 转换为异常。需要业务异常时，在专属配置中声明自己的 `ErrorDecoder`，保留状态码和请求标识，并关闭自行读取的响应流。不要捕获所有异常后返回一个“成功”的空结果。

Spring Cloud OpenFeign 默认禁用 Feign 重试，本文仍显式设置 `Retryer.NEVER_RETRY`；HC5 自身的自动重试通过 `disableAutomaticRetries()` 关闭。对于可能计费的生成接口，还要检查业务层、网关和熔断降级逻辑是否会重复提交。超时不代表任务未创建；启用重试前需先明确幂等约定。

## 验证配置是否生效

授权拦截器可以先做纯单元测试，测试依赖使用 `spring-boot-starter-test`，写法可参考 [单元测试](./unitTest.md)：

```java
package com.example.media;

import java.net.URI;
import feign.RequestTemplate;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class MediaFeignConfigTest {
    @Test
    void shouldReplaceExistingAuthorization() {
        MediaApiProperties properties = new MediaApiProperties(
                URI.create("https://media.example.com"), "unit-test-token",
                3000, 60000, 2000,
                new MediaApiProperties.Proxy(false, "127.0.0.1", 8080));
        RequestTemplate template = new RequestTemplate();
        template.header("Authorization", "Bearer internal-token");

        new MediaFeignConfig().mediaAuthInterceptor(properties).apply(template);

        assertThat(template.headers().get("Authorization"))
                .containsExactly("Bearer unit-test-token");
    }
}
```

它只验证请求头逻辑，不能证明 Spring 作用域或代理路由正确。再用本地 HTTP 桩服务和可记录请求的测试代理完成以下集成验证，避免依赖真实生成接口：

| 场景 | 应验证的结果 |
| --- | --- |
| 代理关闭 | 请求到达桩服务，测试代理未收到请求 |
| 代理开启 | 测试代理记录第三方请求，桩服务收到预期 JSON 和授权 |
| 内部客户端调用 | 不携带第三方 Token，也不经过第三方代理 |
| 父上下文存在内部授权拦截器 | 第三方请求仅包含自己的授权 |
| 连接池占满 / 延迟响应 | 分别触发连接池等待超时和响应超时，不无限阻塞 |
| 桩服务返回 401、429、500 | 异常可区分，请求计数符合重试策略 |
| 应用上下文关闭 | 专属连接池与后台清理线程得到释放 |

调试 Feign 日志还需把客户端接口的日志级别设为 DEBUG：

```yaml
logging:
  level:
    com.example.media.MediaClient: DEBUG
```

本文使用 BASIC 级别观察方法、URL、状态码和耗时。FULL 会记录请求头和正文，可能包含授权或生成素材；需要详细日志时先做好脱敏。HTTPS 证书校验保持开启，遇到企业代理证书时配置可信证书链。

## 常见问题

| 问题 | 优先排查 |
| --- | --- |
| 所有 Feign 都走了第三方代理 | 专属配置是否被组件扫描、全局导入，是否替换了全局 `Client` |
| 第三方出现内部授权请求头 | 是否继承父拦截器，是否用了全局 `defaultConfiguration` |
| 代理打开仍然直连 | 实际使用的是否为专属 `ApacheHttp5Client`，代理配置是否在重启后生效 |
| 配置了 60 秒仍提前超时 | Options、业务总时限、网关 / 代理超时是否一致 |
| 找不到 HttpClient 类或方法 | 是否混用 HC4 / HC5，Feign 模块是否由同一个 BOM 管理 |
| 内部请求开始等待第三方连接 | 是否仍在共享同一个连接池，单路由和总连接数是否合理 |

## 参考资料

- [Spring Cloud OpenFeign 官方说明](https://docs.spring.io/spring-cloud-openfeign/reference/spring-cloud-openfeign.html)：客户端配置、HTTP 实现和日志；阅读时选择项目对应版本。
- [OpenFeign 4.1.4 的客户端装配源码](https://github.com/spring-cloud/spring-cloud-openfeign/blob/v4.1.4/spring-cloud-openfeign-core/src/main/java/org/springframework/cloud/openfeign/FeignClientFactoryBean.java)：核对继承开关与属性配置的关系。
- [Feign 13.5 的 HC5 适配器](https://github.com/OpenFeign/feign/blob/13.5/hc5/src/main/java/feign/hc5/ApacheHttp5Client.java)：核对 Options 到 HC5 请求配置的映射。
- [Apache HttpClient 5 文档与示例](https://hc.apache.org/httpcomponents-client-5.3.x/quickstart.html)：连接池、代理和客户端生命周期。
