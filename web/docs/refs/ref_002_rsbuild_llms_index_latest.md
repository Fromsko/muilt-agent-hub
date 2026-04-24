---
tags:
  - rsbuild
  - documentation
  - index
  - build-tool
aliases:
  - Rsbuild 文档索引
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Rsbuild 是由 Rspack 驱动的高性能构建工具。本文档是 Rsbuild 官方文档的完整索引，包含指南、配置、插件、API 和社区资源。

## 核心内容

### 简介
Rsbuild is a high-performance build tool powered by Rspack.

### 指南 (Guide)

#### 快速开始
- [Introduction](https://rsbuild.rs/guide/start/index.md) - 介绍
- [Quick start](https://rsbuild.rs/guide/start/quick-start.md) - 快速开始
- [Features](https://rsbuild.rs/guide/start/features.md) - 功能特性
- [Glossary](https://rsbuild.rs/guide/start/glossary.md) - 术语表
- [AI](https://rsbuild.rs/guide/start/ai.md) - AI 支持

#### 框架集成
- [React](https://rsbuild.rs/guide/framework/react.md) - React 框架
- [Vue](https://rsbuild.rs/guide/framework/vue.md) - Vue 框架
- [Preact](https://rsbuild.rs/guide/framework/preact.md) - Preact 框架
- [Svelte](https://rsbuild.rs/guide/framework/svelte.md) - Svelte 框架
- [Solid](https://rsbuild.rs/guide/framework/solid.md) - Solid 框架

#### 基础配置
- [CLI](https://rsbuild.rs/guide/basic/cli.md) - 命令行工具
- [Dev server](https://rsbuild.rs/guide/basic/server.md) - 开发服务器
- [Output files](https://rsbuild.rs/guide/basic/output-files.md) - 输出文件
- [Static assets](https://rsbuild.rs/guide/basic/static-assets.md) - 静态资源
- [HTML](https://rsbuild.rs/guide/basic/html-template.md) - HTML 模板
- [JSON](https://rsbuild.rs/guide/basic/json-files.md) - JSON 文件
- [Wasm](https://rsbuild.rs/guide/basic/wasm-assets.md) - WebAssembly
- [TypeScript](https://rsbuild.rs/guide/basic/typescript.md) - TypeScript 支持
- [Web Workers](https://rsbuild.rs/guide/basic/web-workers.md) - Web Workers
- [Deploy static site](https://rsbuild.rs/guide/basic/static-deploy.md) - 静态站点部署

#### 高级配置
- [Configure Rspack](https://rsbuild.rs/guide/configuration/rspack.md) - 配置 Rspack
- [Configure Rsbuild](https://rsbuild.rs/guide/configuration/rsbuild.md) - 配置 Rsbuild
- [Configure SWC](https://rsbuild.rs/guide/configuration/swc.md) - 配置 SWC
- [CSS](https://rsbuild.rs/guide/styling/css-usage.md) - CSS 使用
- [CSS Modules](https://rsbuild.rs/guide/styling/css-modules.md) - CSS Modules
- [CSS-in-JS](https://rsbuild.rs/guide/styling/css-in-js.md) - CSS-in-JS
- [Tailwind CSS v4](https://rsbuild.rs/guide/styling/tailwindcss.md) - Tailwind CSS v4
- [Tailwind CSS v3](https://rsbuild.rs/guide/styling/tailwindcss-v3.md) - Tailwind CSS v3
- [UnoCSS](https://rsbuild.rs/guide/styling/unocss.md) - UnoCSS
- [Path aliases](https://rsbuild.rs/guide/advanced/alias.md) - 路径别名
- [Environment variables](https://rsbuild.rs/guide/advanced/env-vars.md) - 环境变量
- [Hot module replacement](https://rsbuild.rs/guide/advanced/hmr.md) - 热模块替换
- [Browserslist](https://rsbuild.rs/guide/advanced/browserslist.md) - Browserslist
- [Browser compatibility](https://rsbuild.rs/guide/advanced/browser-compatibility.md) - 浏览器兼容性
- [Module Federation](https://rsbuild.rs/guide/advanced/module-federation.md) - 模块联邦
- [Multi-environment builds](https://rsbuild.rs/guide/advanced/environments.md) - 多环境构建
- [Server-side rendering (SSR)](https://rsbuild.rs/guide/advanced/ssr.md) - 服务端渲染
- [Testing](https://rsbuild.rs/guide/advanced/testing.md) - 测试
- [Code splitting](https://rsbuild.rs/guide/optimization/code-splitting.md) - 代码分割
- [Bundle size optimization](https://rsbuild.rs/guide/optimization/optimize-bundle.md) - 打包优化
- [Improve build performance](https://rsbuild.rs/guide/optimization/build-performance.md) - 构建性能优化
- [Inline static assets](https://rsbuild.rs/guide/optimization/inline-assets.md) - 内联静态资源
- [Upgrading Rsbuild](https://rsbuild.rs/guide/upgrade/upgrade-rsbuild.md) - 升级 Rsbuild
- [Upgrading from 0.x to v1](https://rsbuild.rs/guide/upgrade/v0-to-v1.md) - 从 0.x 升级到 v1

#### 迁移指南
- [webpack](https://rsbuild.rs/guide/migration/webpack.md) - 从 webpack 迁移
- [Create React App](https://rsbuild.rs/guide/migration/cra.md) - 从 CRA 迁移
- [Vue CLI](https://rsbuild.rs/guide/migration/vue-cli.md) - 从 Vue CLI 迁移
- [Vite](https://rsbuild.rs/guide/migration/vite.md) - 从 Vite 迁移
- [Vite plugin](https://rsbuild.rs/guide/migration/vite-plugin.md) - Vite 插件迁移
- [Modern.js Builder](https://rsbuild.rs/guide/migration/modern-builder.md) - Modern.js Builder 迁移

#### 调试
- [Debug mode](https://rsbuild.rs/guide/debug/debug-mode.md) - 调试模式
- [Build profiling](https://rsbuild.rs/guide/debug/build-profiling.md) - 构建性能分析
- [Use Rsdoctor](https://rsbuild.rs/guide/debug/rsdoctor.md) - 使用 Rsdoctor

#### 常见问题
- [General FAQ](https://rsbuild.rs/guide/faq/general.md) - 常见问题
- [Features FAQ](https://rsbuild.rs/guide/faq/features.md) - 功能 FAQ
- [Exceptions FAQ](https://rsbuild.rs/guide/faq/exceptions.md) - 异常 FAQ
- [HMR FAQ](https://rsbuild.rs/guide/faq/hmr.md) - HMR FAQ

### 配置 (Config)

#### 核心配置
- [Config overview](https://rsbuild.rs/config/index.md) - 配置概览
- [root](https://rsbuild.rs/config/root.md) - 根目录
- [mode](https://rsbuild.rs/config/mode.md) - 模式
- [plugins](https://rsbuild.rs/config/plugins.md) - 插件
- [logLevel](https://rsbuild.rs/config/log-level.md) - 日志级别
- [environments](https://rsbuild.rs/config/environments.md) - 环境

#### 开发配置
- [dev.assetPrefix](https://rsbuild.rs/config/dev/asset-prefix.md) - 资源前缀
- [dev.browserLogs](https://rsbuild.rs/config/dev/browser-logs.md) - 浏览器日志
- [dev.cliShortcuts](https://rsbuild.rs/config/dev/cli-shortcuts.md) - CLI 快捷键
- [dev.client](https://rsbuild.rs/config/dev/client.md) - 客户端配置
- [dev.hmr](https://rsbuild.rs/config/dev/hmr.md) - HMR 配置
- [dev.lazyCompilation](https://rsbuild.rs/config/dev/lazy-compilation.md) - 懒编译
- [dev.liveReload](https://rsbuild.rs/config/dev/live-reload.md) - 实时重载
- [dev.progressBar](https://rsbuild.rs/config/dev/progress-bar.md) - 进度条
- [dev.setupMiddlewares](https://rsbuild.rs/config/dev/setup-middlewares.md) - 中间件设置
- [dev.watchFiles](https://rsbuild.rs/config/dev/watch-files.md) - 文件监听
- [dev.writeToDisk](https://rsbuild.rs/config/dev/write-to-disk.md) - 写入磁盘

#### 解析配置
- [resolve.aliasStrategy](https://rsbuild.rs/config/resolve/alias-strategy.md) - 别名策略
- [resolve.alias](https://rsbuild.rs/config/resolve/alias.md) - 别名
- [resolve.conditionNames](https://rsbuild.rs/config/resolve/condition-names.md) - 条件名称
- [resolve.dedupe](https://rsbuild.rs/config/resolve/dedupe.md) - 去重
- [resolve.extensions](https://rsbuild.rs/config/resolve/extensions.md) - 扩展名
- [resolve.mainFields](https://rsbuild.rs/config/resolve/main-fields.md) - 主字段

#### 源码配置
- [source.assetsInclude](https://rsbuild.rs/config/source/assets-include.md) - 资源包含
- [source.decorators](https://rsbuild.rs/config/source/decorators.md) - 装饰器
- [source.define](https://rsbuild.rs/config/source/define.md) - 定义
- [source.entry](https://rsbuild.rs/config/source/entry.md) - 入口
- [source.exclude](https://rsbuild.rs/config/source/exclude.md) - 排除
- [source.include](https://rsbuild.rs/config/source/include.md) - 包含
- [source.preEntry](https://rsbuild.rs/config/source/pre-entry.md) - 预入口
- [source.transformImport](https://rsbuild.rs/config/source/transform-import.md) - 导入转换
- [source.tsconfigPath](https://rsbuild.rs/config/source/tsconfig-path.md) - tsconfig 路径

#### 输出配置
- [output.assetPrefix](https://rsbuild.rs/config/output/asset-prefix.md) - 资源前缀
- [output.charset](https://rsbuild.rs/config/output/charset.md) - 字符集
- [output.cleanDistPath](https://rsbuild.rs/config/output/clean-dist-path.md) - 清理输出目录
- [output.copy](https://rsbuild.rs/config/output/copy.md) - 复制
- [output.cssModules](https://rsbuild.rs/config/output/css-modules.md) - CSS Modules
- [output.dataUriLimit](https://rsbuild.rs/config/output/data-uri-limit.md) - Data URI 限制
- [output.distPath](https://rsbuild.rs/config/output/dist-path.md) - 输出路径
- [output.emitAssets](https://rsbuild.rs/config/output/emit-assets.md) - 输出资源
- [output.emitCss](https://rsbuild.rs/config/output/emit-css.md) - 输出 CSS
- [output.externals](https://rsbuild.rs/config/output/externals.md) - 外部依赖
- [output.filenameHash](https://rsbuild.rs/config/output/filename-hash.md) - 文件名哈希
- [output.filename](https://rsbuild.rs/config/output/filename.md) - 文件名
- [output.injectStyles](https://rsbuild.rs/config/output/inject-styles.md) - 注入样式
- [output.inlineScripts](https://rsbuild.rs/config/output/inline-scripts.md) - 内联脚本
- [output.inlineStyles](https://rsbuild.rs/config/output/inline-styles.md) - 内联样式
- [output.legalComments](https://rsbuild.rs/config/output/legal-comments.md) - 法律注释
- [output.manifest](https://rsbuild.rs/config/output/manifest.md) - 清单
- [output.minify](https://rsbuild.rs/config/output/minify.md) - 压缩
- [output.module](https://rsbuild.rs/config/output/module.md) - 模块
- [output.overrideBrowserslist](https://rsbuild.rs/config/output/override-browserslist.md) - 覆盖 Browserslist
- [output.polyfill](https://rsbuild.rs/config/output/polyfill.md) - Polyfill
- [output.sourceMap](https://rsbuild.rs/config/output/source-map.md) - Source Map
- [output.target](https://rsbuild.rs/config/output/target.md) - 目标

#### HTML 配置
- [html.appIcon](https://rsbuild.rs/config/html/app-icon.md) - 应用图标
- [html.crossorigin](https://rsbuild.rs/config/html/crossorigin.md) - CORS
- [html.favicon](https://rsbuild.rs/config/html/favicon.md) - Favicon
- [html.inject](https://rsbuild.rs/config/html/inject.md) - 注入
- [html.meta](https://rsbuild.rs/config/html/meta.md) - Meta 标签
- [html.mountId](https://rsbuild.rs/config/html/mount-id.md) - 挂载 ID
- [html.outputStructure](https://rsbuild.rs/config/html/output-structure.md) - 输出结构
- [html.scriptLoading](https://rsbuild.rs/config/html/script-loading.md) - 脚本加载
- [html.tags](https://rsbuild.rs/config/html/tags.md) - 标签
- [html.templateParameters](https://rsbuild.rs/config/html/template-parameters.md) - 模板参数
- [html.template](https://rsbuild.rs/config/html/template.md) - 模板
- [html.title](https://rsbuild.rs/config/html/title.md) - 标题

#### 服务器配置
- [server.base](https://rsbuild.rs/config/server/base.md) - 基础路径
- [server.compress](https://rsbuild.rs/config/server/compress.md) - 压缩
- [server.cors](https://rsbuild.rs/config/server/cors.md) - CORS
- [server.headers](https://rsbuild.rs/config/server/headers.md) - 响应头
- [server.historyApiFallback](https://rsbuild.rs/config/server/history-api-fallback.md) - 历史回退
- [server.host](https://rsbuild.rs/config/server/host.md) - 主机
- [server.htmlFallback](https://rsbuild.rs/config/server/html-fallback.md) - HTML 回退
- [server.https](https://rsbuild.rs/config/server/https.md) - HTTPS
- [server.middlewareMode](https://rsbuild.rs/config/server/middleware-mode.md) - 中间件模式
- [server.open](https://rsbuild.rs/config/server/open.md) - 自动打开
- [server.port](https://rsbuild.rs/config/server/port.md) - 端口
- [server.printUrls](https://rsbuild.rs/config/server/print-urls.md) - 打印 URL
- [server.proxy](https://rsbuild.rs/config/server/proxy.md) - 代理
- [server.publicDir](https://rsbuild.rs/config/server/public-dir.md) - 公共目录
- [server.strictPort](https://rsbuild.rs/config/server/strict-port.md) - 严格端口

#### 安全配置
- [security.nonce](https://rsbuild.rs/config/security/nonce.md) - Nonce
- [security.sri](https://rsbuild.rs/config/security/sri.md) - SRI

#### 工具配置
- [tools.bundlerChain](https://rsbuild.rs/config/tools/bundler-chain.md) - Bundler Chain
- [tools.cssExtract](https://rsbuild.rs/config/tools/css-extract.md) - CSS 提取
- [tools.cssLoader](https://rsbuild.rs/config/tools/css-loader.md) - CSS Loader
- [tools.htmlPlugin](https://rsbuild.rs/config/tools/html-plugin.md) - HTML 插件
- [tools.lightningcssLoader](https://rsbuild.rs/config/tools/lightningcss-loader.md) - Lightning CSS Loader
- [tools.postcss](https://rsbuild.rs/config/tools/postcss.md) - PostCSS
- [tools.rspack](https://rsbuild.rs/config/tools/rspack.md) - Rspack
- [tools.styleLoader](https://rsbuild.rs/config/tools/style-loader.md) - Style Loader
- [tools.swc](https://rsbuild.rs/config/tools/swc.md) - SWC

#### 性能配置
- [performance.buildCache](https://rsbuild.rs/config/performance/build-cache.md) - 构建缓存
- [performance.bundleAnalyze](https://rsbuild.rs/config/performance/bundle-analyze.md) - 打包分析
- [performance.chunkSplit](https://rsbuild.rs/config/performance/chunk-split.md) - 代码分割
- [performance.dnsPrefetch](https://rsbuild.rs/config/performance/dns-prefetch.md) - DNS 预取
- [performance.preconnect](https://rsbuild.rs/config/performance/preconnect.md) - 预连接
- [performance.prefetch](https://rsbuild.rs/config/performance/prefetch.md) - 预取
- [performance.preload](https://rsbuild.rs/config/performance/preload.md) - 预加载
- [performance.printFileSize](https://rsbuild.rs/config/performance/print-file-size.md) - 打印文件大小
- [performance.profile](https://rsbuild.rs/config/performance/profile.md) - 性能分析
- [performance.removeConsole](https://rsbuild.rs/config/performance/remove-console.md) - 移除 console
- [performance.removeMomentLocale](https://rsbuild.rs/config/performance/remove-moment-locale.md) - 移除 Moment Locale

#### 模块联邦
- [moduleFederation.options](https://rsbuild.rs/config/module-federation/options.md) - 模块联邦选项

### 插件 (Plugin)
- [Plugin list](https://rsbuild.rs/plugins/list/index.md) - 插件列表
- [React plugin](https://rsbuild.rs/plugins/list/plugin-react.md) - React 插件
- [SVGR plugin](https://rsbuild.rs/plugins/list/plugin-svgr.md) - SVGR 插件
- [Vue plugin](https://rsbuild.rs/plugins/list/plugin-vue.md) - Vue 插件
- [Preact plugin](https://rsbuild.rs/plugins/list/plugin-preact.md) - Preact 插件
- [Svelte plugin](https://rsbuild.rs/plugins/list/plugin-svelte.md) - Svelte 插件
- [Solid plugin](https://rsbuild.rs/plugins/list/plugin-solid.md) - Solid 插件
- [Babel plugin](https://rsbuild.rs/plugins/list/plugin-babel.md) - Babel 插件
- [Sass plugin](https://rsbuild.rs/plugins/list/plugin-sass.md) - Sass 插件
- [Less plugin](https://rsbuild.rs/plugins/list/plugin-less.md) - Less 插件
- [Stylus plugin](https://rsbuild.rs/plugins/list/plugin-stylus.md) - Stylus 插件
- [Plugin development](https://rsbuild.rs/plugins/dev/index.md) - 插件开发
- [Plugin API](https://rsbuild.rs/plugins/dev/core.md) - 插件 API
- [Plugin hooks](https://rsbuild.rs/plugins/dev/hooks.md) - 插件钩子

### API (API)
- [JavaScript API](https://rsbuild.rs/api/start/index.md) - JavaScript API
- [Rsbuild core](https://rsbuild.rs/api/javascript-api/core.md) - Rsbuild 核心
- [Rsbuild instance](https://rsbuild.rs/api/javascript-api/instance.md) - Rsbuild 实例
- [Rsbuild types](https://rsbuild.rs/api/javascript-api/types.md) - Rsbuild 类型
- [Dev server API](https://rsbuild.rs/api/javascript-api/dev-server-api.md) - 开发服务器 API
- [Environment API](https://rsbuild.rs/api/javascript-api/environment-api.md) - 环境 API

### 社区 (Community)
- [Rsbuild community](https://rsbuild.rs/community/index.md) - Rsbuild 社区
- [Overview](https://rsbuild.rs/community/releases/index.md) - 版本概览
- [Announcing Rsbuild 1.0](https://rsbuild.rs/community/releases/v1-0.md) - Rsbuild 1.0 发布
- [Announcing Rsbuild 0.7](https://rsbuild.rs/community/releases/v0-7.md) - Rsbuild 0.7 发布
- [Announcing Rsbuild 0.6](https://rsbuild.rs/community/releases/v0-6.md) - Rsbuild 0.6 发布
- [Announcing Rsbuild 0.5](https://rsbuild.rs/community/releases/v0-5.md) - Rsbuild 0.5 发布
- [Announcing Rsbuild 0.4](https://rsbuild.rs/community/releases/v0-4.md) - Rsbuild 0.4 发布
- [Announcing Rsbuild 0.3](https://rsbuild.rs/community/releases/v0-3.md) - Rsbuild 0.3 发布
- [Announcing Rsbuild 0.2](https://rsbuild.rs/community/releases/v0-2.md) - Rsbuild 0.2 发布
- [Announcing Rsbuild 0.1](https://rsbuild.rs/community/releases/v0-1.md) - Rsbuild 0.1 发布

## 相关资源

- [[ref_001_ant-design-rsbuild_latest]] - Ant Design 与 Rsbuild 综合指南
- [[ref_003_rsbuild_testing_latest]] - Rsbuild 测试配置指南
- [[ref_004_ant-design-rsbuild-integration_latest]] - Ant Design Rsbuild 集成详细步骤

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：文档索引
