---
tags:
  - rstest
  - testing
  - rspack
  - framework
aliases:
  - Rstest 测试框架概览
created: 2026-04-19
updated: 2026-04-19
status: active
---

> [!abstract] 概述
> Rstest 是基于 Rspack 的测试框架，为 Rspack 生态系统提供全面、一流的支持，能够无缝集成到现有的基于 Rspack 的项目中。

## 核心内容

### 框架特性

- **Rspack 生态集成**：为 Rspack 生态系统提供原生支持
- **Jest 兼容 API**：提供完全兼容 Jest 的 API
- **现代特性支持**：原生支持 TypeScript、ESM 等现代特性
- **高性能**：基于 Rspack 构建，提供快速测试体验

### 核心能力

- **Node 测试**：支持 happy-dom/jsdom 模拟 DOM 环境
- **浏览器模式**：支持真实浏览器环境测试（实验性）
- **多项目测试**：支持 monorepo 和多项目配置
- **测试分片**：支持并行测试执行
- **代码覆盖率**：内置覆盖率收集功能
- **Mock 系统**：完整的模块和函数 mock 功能

### 生态系统集成

- **Rsbuild**：通过 `@rstest/adapter-rsbuild` 复用 Rsbuild 配置
- **Rspack**：直接支持 Rspack 配置
- **Rslib**：支持库开发场景
- **React/Vue**：提供框架特定的测试工具

## 相关资源

- [[ref_016_rstest_configuration_v1.0]] - Rstest 配置指南
- [[ref_017_rstest_react_integration_v1.0]] - React 集成指南
- [[ref_018_rstest_api_reference_v1.0]] - API 参考
- [Rstest 官方文档](https://rstest.rs) - 官方网站
- [Rstest GitHub](https://github.com/web-infra-dev/rstest) - 源代码仓库

## 来源信息

- 搜索方式：llms-full.txt 文档读取
- 发现时间：2026-04-19
- 可信度评估：高（官方文档）
- 资源类型：技术框架文档
