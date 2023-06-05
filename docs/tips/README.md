# 技巧，效率，心得
::: tip 前言
Java8引入的lamda表达式，完善了Java的函数式编程，在日常编码中可以善用Java的lamda表达式优化代码，提高可读性。<br/>

日常编码中，大量的工具类被编码出，但是都随着项目的流失而消失了，下次想用却无了，所以可以收集日常的工具类，包括自己写得、对开源的工具二次封装的，都是可以的。<br/>

**欢迎大家投稿，一起完善。** [发起pr](https://gitee.com/zang-dongkun/blog)。
:::
## Java
### throwIf():处理异常抛出

**throwIf()** 是对编码中的条件成立，则抛出异常的优化处理，我们只需要提供条件，告诉要跑出的异常即可；直接把if语句抽出为一个块级语法。其中使用了Java内置的函数接口**Supplier**供给者接口，返回一个异常对象。

```java
public static <X extends Throwable> void throwIf(boolean condition, Supplier<X> supplier) throws X {
      if (condition) {
        throw supplier.get();
      }
}
```
**【例-throwIf()使用】**

### doIf():替代If()
```java
    /**
     * 执行一段逻辑
     *
     * @param condition
     * @param noArgsFunction
     * @param <T>
     */
    public static <T> void doIf(boolean condition, NoArgsFunction noArgsFunction) {
        if (condition) {
            noArgsFunction.exec();
        }
    }

    @FunctionalInterface
    public interface NoArgsFunction {
        /**
         * 没有输入，没有输出，只执行一段逻辑
         */
        void exec();
    }
```
**【例-doIf()使用】**
## Json优化操作

### 格式化Json
将json按照层级展开，进行格式化
### JsonTree
直接把一串json改成一颗树，操作数据结构树
### JsonPath
相当于按照路径查找json中key对应的value，不需要进行一次Json对象转换
## Redission 优化使用

### 执行业务锁优化

> 采用lambda 函数接口优化业务逻辑

```java
@Slf4j
@Service
public class LockUtils {


    @Autowired
    private RedissonClient redissonClient;

    /**
     * 自动加锁，执行业务，释放锁
     *
     * @param lockBusiness
     * @param lockName
     */
    public void tryLockAndExec(LockBusiness lockBusiness, String lockName) {
        RLock lock = redissonClient.getLock(lockName);
        lock.lock();
        try {
            log.info("lockName:【{}】已成功 *加* 锁", lockName);
            lockBusiness.business();
        } finally {
            lock.unlock();
            log.info("lockName:【{}】已成功 *解* 锁", lockName);
        }
    }

    @FunctionalInterface
    public interface LockBusiness {
        /**
         * 锁业务，没有任何参数与返回值
         */
        void business();
    }
}
```
## Spring使用优化

### 使用构造器注入代替属性注入

**一般情况**，使用Spring注入时，可能会选择`@Autowired`或者`@Resource`两个注解，如下：

```java
@Service
public class ArticleDataService {
    @Autowired
    private RedisTemplate redisTemplate;
    @Resource
    private LikeDomainService likeDomainService;
}
```
但是如上两个注解会存在数据不存在，注入的数据为null的情况，而且项目启动时有可能无法正常启动，缺乏依赖异常。<br/>
问题本质就是在编译期间，错误没有检查出来，所以可以借助Java编译期间检查，检查依赖是否存在，避免上述问题。<br/>
**替换方案：**   使用有参构造器注入属性，同时设置需要注入的属性为`final`类型，强制构造器注入，体检进行依赖注入。

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class UserCaseService {

    private final UserDomainService userDomainService;
    private final PasswordEncodeAndDecode passwordEncodeAndDecode;
    private final UserRoleDomainService userRoleDomainService;
    private final RoleDomainService roleDomainService;
}
```


