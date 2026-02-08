# wails-demo
wails-demo

将名字更改为 WRDM wails redis desktop manager

是一个非常实用的 Redis 可视化管理工具，尤其适合开发者日常连接、查看和调试 Redis 数据库。

✅ 推荐理由：
轻量 & 开源

基于现代技术栈（如 Wails + Vue + TypeScript），代码透明，可自行编译或二次开发。
跨平台支持

支持 Windows、macOS 和 Linux（得益于 Wails 框架）。
界面简洁直观

提供树形结构展示 keys，支持字符串、哈希、列表、集合等所有 Redis 数据类型可视化。
连接管理方便

可保存多个连接配置，支持 SSH 隧道、TLS、密码认证等企业级功能。
活跃维护（截至 2025 年）

相比一些已停止更新的旧版 Redis GUI 工具（如早期的 Redis Desktop Manager 商业版），这个社区版本持续迭代。
本地运行，数据安全

所有操作都在本地执行，不上传数据到云端，适合对安全性要求高的场景。

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



## 全局安装ts

```bash
npm install -g typescript
```
以上命令会在全局环境下安装 tsc 命令，安装完成之后，我们就可以在任何地方执行 tsc 命令了。

```bash
tsc hello.ts
```



9d897894b6bbcf85fe3adc6f86c458afecea3c83