# wails-demo
wails-demo


## Install

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## 检查 wails是否安装成功以及依赖是否全部ok

```bash
wails doctor
```

## 创建 wials vue TS 项目

```bash
wails init -n myproject -t vue-ts
```


## 编译

### 仅仅编译
编译之后需要进入到二进制文件包进行运行

```bash
wails build
```
### 编译并运行应用

```bash
wails dev
```
使用 wails dev 命令在开发模式下运行时，资源会从磁盘加载，任何更改都会导致“实时重新加载”。资源的位置将从 embed.FS 推断出来。

## 将绑定的go代码创建为Js模块
```bash
wails generate module
```

## 使用说明

当您运行 wails dev（或 wails generate module）时，将生成一个前端模块，其中包含以下内容：

所有绑定方法的 JavaScript 绑定
所有绑定方法的 TypeScript 声明
绑定方法用作输入或输出的所有 Go 结构的 TypeScript 声明
这使得使用相同的强类型数据结构从前端调用 Go 代码变得异常简单。


Go 运行时可通过导入 github.com/wailsapp/wails/v2/pkg/runtime 获取。 此包中的所有方法都将 context 作为第一个参数。 此 context 应该从 应用启动回调 或 前端 Dom 加载完成回调 回调方法中获取