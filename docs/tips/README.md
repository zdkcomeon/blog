# 技巧，效率，心得

## Java
### throwIf():处理异常抛出
```java
public static <X extends Throwable> void throwIf(boolean condition, Supplier<X> supplier) throws X {
      if (condition) {
        throw supplier.get();
      }
}
```
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
## Json优化操作

### 格式化Json
将json按照层级展开，进行格式化
### JsonTree
直接把一串json改成一颗树，操作数据结构树
### JsonPath
相当于按照路径查找json中key对应的value，不需要进行一次Json对象转换
