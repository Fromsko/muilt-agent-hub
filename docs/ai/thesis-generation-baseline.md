# 论文生成基线

## 1. 输入资料

- 项目代码：`C:\coding\02-school\school\ll-code\core`
- 学校规范：`C:\coding\02-school\school\ll-code\paser-docx\docs\01-standards\thesis-writing-standard.md`
- 学校格式标准：`C:\coding\02-school\school\ll-code\paser-docx\docs\01-standards\thesis_format_standard.md`
- 参考模板：`C:\coding\02-school\school\ll-code\基于机器学习的食物营养搭配推荐系统的设计与实现.docx`
- 历史论文稿：`C:\coding\02-school\school\ll-code\基于Fastapi+React的多智能体配置与交互平台的设计与实现-下载评阅稿.docx`

## 2. 当前范围判断

当前工作区里可以直接作为论文事实依据的实现，来自`core/app`中的FastAPI后端项目和`core/web`中的React前端项目。前端已经具备独立入口、受保护路由、登录页、仪表盘、Prompt/Key/Agent管理页、对话页、API Token页、OpenKey页、MCP工具页、日志页、用户管理页和系统设置页，因此论文应采用“前后端协同实现”的写法，而不是只写后端。

历史论文稿仍然可以作为题目表达、章节组织和学校封面字段的参考，但不能直接当作当前项目的权威实现依据。旧稿中的`Next.js`、`TailwindCSS`、部分旧页面和旧业务措辞，需要根据当前`core/web`和`core/app`的真实代码重新核对后再决定是否复用。

## 3. 模板与学校规范的共识和差异

### 3.1 已确认的共识

- 学校规范要求中文摘要、英文摘要、正文、参考文献、致谢这些部分齐全。
- 学校规范和参考模板都采用按章编号的结构，正文主体使用第1章到第7章。
- 学校规范和参考模板都要求图按“图X-Y”编号，表按“表X-Y”编号。
- 图题位于图下方，表题位于表上方。
- 一级标题需要分页开始。

### 3.2 已发现的模板事实

- 参考模板前部实际顺序为：封面、中文摘要、英文摘要、正文、参考文献、致谢。
- 参考模板前35段中未看到目录内容，因此目录是否保留，需要以后续送审模板或学校最终要求为准。
- 模板正文常用样式是`Normal`，标题样式是`Heading 1`、`Heading 2`、`Heading 3`，图题样式是`Caption`。
- 模板实际页面设置接近：上2.5cm、下2.0cm、左2.5cm、右2.0cm，页眉距离约1.5cm，页脚距离约1.75cm。
- 模板里常见的图题样式为居中显示，字号约10.5pt。

### 3.3 需要优先服从的规则

最终生成文档时，应优先服从参考模板的真实样式。学校规范文档可以作为检查清单，但Word成品的字体、段落、页边距和图表格式应以模板提取结果为准。

## 4. 建议论文题目

### 4.1 主标题建议

`基于FastAPI与React的多用户AI智能体配置与交互平台设计与实现`

### 4.2 备选标题

- `基于前后端分离架构的多用户AI智能体配置与交互平台设计与实现`
- `多用户AI智能体配置与交互平台的设计与实现`
- `多用户AI智能体配置与对话平台的设计与实现`

## 5. 项目真实模块与证据文件

### 5.1 前端入口与基础设施

- 前端依赖与构建脚本：`core/web/package.json`
- 应用启动与全局初始化：`core/web/src/index.tsx`
- 路由树：`core/web/src/routeTree.gen.ts`
- 受保护路由入口：`core/web/src/routes/_auth/route.tsx`
- 主布局：`core/web/src/components/Layout/MainLayout/index.tsx`
- HTTP客户端：`core/web/src/core/http/client.ts`
- 会话恢复：`core/web/src/core/auth/session.ts`
- 认证状态存储：`core/web/src/stores/auth.ts`

### 5.2 前端页面与交互模块

- 登录页：`core/web/src/routes/login/index.tsx`
- 仪表盘：`core/web/src/routes/_auth/dashboard/index.tsx`
- Prompt管理页：`core/web/src/routes/_auth/prompts/index.tsx`
- 模型密钥页：`core/web/src/routes/_auth/keys/index.tsx`
- 智能体管理页：`core/web/src/routes/_auth/agents/index.tsx`
- 对话页：`core/web/src/routes/_auth/chat/$agentId.tsx`
- API Token页：`core/web/src/routes/_auth/api-tokens/index.tsx`
- OpenKey页：`core/web/src/routes/_auth/open-keys/index.tsx`
- MCP工具页：`core/web/src/routes/_auth/mcp-servers/index.tsx`
- 日志页：`core/web/src/routes/_auth/logs/index.tsx`
- 用户管理页：`core/web/src/routes/_auth/users/index.tsx`
- 系统设置页：`core/web/src/routes/_auth/settings/index.tsx`

### 5.3 后端入口与基础设施

- 应用入口与路由挂载：`core/app/main.py`
- 配置管理：`core/app/config.py`
- 数据库初始化：`core/app/db.py`
- 请求链路中间件：`core/app/core/middleware.py`
- 结构化日志与异步落库：`core/app/core/logging.py`

### 5.4 用户认证与权限控制

- 前端登录与用户会话恢复：`core/web/src/api/auth.ts`、`core/web/src/core/auth/session.ts`
- JWT登录和刷新令牌：`core/app/routers/auth.py`
- 用户管理器：`core/app/auth/manager.py`
- 平台API Token认证：`core/app/auth/platform.py`
- OpenKey认证与限频限额：`core/app/auth/openkey.py`
- 管理员用户管理：`core/app/routers/admin_users.py`

### 5.5 资源配置与对话开放能力

- Prompt模型：`core/app/models/prompt.py`
- 模型密钥模型：`core/app/models/key.py`
- 智能体模型：`core/app/models/agent.py`
- Prompt/Key/Agent相关路由：`core/app/routers/prompts.py`、`core/app/routers/keys.py`、`core/app/routers/agents.py`
- 对话接口与SSE调用：`core/app/routers/chat.py`、`core/web/src/api/agenthub.ts`
- 公共Token聊天接口：`core/app/routers/public.py`
- OpenAI兼容网关：`core/app/routers/openai_compat.py`
- 聊天核心服务：`core/app/services/chat_service.py`
- 会话消息模型：`core/app/models/message.py`

### 5.6 工具扩展与平台治理模块

- MCP服务注册与绑定：`core/app/routers/mcp_servers.py`
- MCP服务与绑定模型：`core/app/models/mcp_server.py`
- 调用统计：`core/app/routers/stats.py`、`core/web/src/routes/_auth/dashboard/index.tsx`
- 日志查询：`core/app/routers/logs.py`、`core/web/src/routes/_auth/logs/index.tsx`
- 调用日志模型：`core/app/models/call_log.py`
- 应用日志模型：`core/app/models/app_log.py`
- 平台API Token模型与路由：`core/app/models/api_token.py`、`core/app/routers/api_tokens.py`
- OpenKey模型与管理路由：`core/app/models/open_key.py`、`core/app/routers/open_keys.py`

## 6. 论文正文结构映射

### 6.1 第1章 前言

本章说明平台建设背景、现有AI应用平台的常见问题、当前项目的研究内容和论文结构安排。这里要强调的问题不是“聊天功能怎么做”，而是“多模型接入、密钥安全、智能体配置、多用户隔离和外部开放接口如何统一管理”。

### 6.2 第2章 相关技术与原理

本章应围绕实际代码中的关键技术展开，建议采用以下小节：

- `2.1 React前端框架`
- `2.2 Rsbuild前端构建工具`
- `2.3 TanStack Router路由权限控制`
- `2.4 TanStack Query远程状态管理`
- `2.5 Zustand本地状态管理`
- `2.6 Ant Design界面组件`
- `2.7 FastAPI异步Web服务`
- `2.8 SQLModel数据模型设计`
- `2.9 SQLAlchemy异步会话访问`
- `2.10 SQLite数据存储`
- `2.11 fastapi-users用户体系`
- `2.12 JWT认证机制`
- `2.13 LiteLLM统一模型接入`
- `2.14 MCP协议`
- `2.15 工具扩展机制`
- `2.16 数据安全机制`
- `2.17 调用日志机制`
- `2.18 统计聚合机制`

### 6.3 第3章 系统分析

本章重点写可行性分析和需求分析。需求分析建议分为三类角色：

- 普通用户
- 超级管理员
- 外部调用方

其中“外部调用方”可以通过平台API Token或OpenKey访问系统，因此它在本项目里是一个真实存在的使用主体。

### 6.4 第4章 系统设计

本章应从系统架构、模块设计、数据库设计和接口设计四个部分展开。系统架构建议写成“浏览器端React控制台 + FastAPI平台服务 + SQLite数据库 + 外部大模型服务 + MCP外部工具服务 + 第三方调用方”的结构。前端不仅是展示层，还承担登录、路由保护、状态恢复、资源管理、对话入口和日志查询等职责，因此第4章要明确写出前后端之间的协作边界。

### 6.5 第5章 系统实现

本章应围绕真实模块展开，不按模板中的“食物管理”那套内容照搬。建议改为：

- `5.1 登录认证与会话恢复`
- `5.2 仪表盘与资源总览`
- `5.3 Prompt、模型密钥与智能体配置`
- `5.4 对话界面、流式响应与消息历史`
- `5.5 平台API Token与OpenAI兼容网关`
- `5.6 MCP服务发现、绑定与工具调用`
- `5.7 日志、用户管理与系统设置`

### 6.6 第6章 测试与部署

本章可基于已有`smoke_test.py`、前端页面联调、Swagger接口验证、日志接口、统计接口，以及`core/web`中的测试脚本来写。前端项目已经配置了`rstest`和`playwright`相关脚本，因此第6章既可以写后端接口与冒烟验证，也可以写前端页面访问、登录流程、日志页筛选和对话页联调结果。若后续启动项目，还可以补充实际页面截图和浏览器Network记录。

### 6.7 第7章 总结

本章总结平台已实现的前后端协同能力，再写出当前项目的不足，比如数据库默认使用SQLite、角色权限粒度还可以继续细化、部分控制台页面仍有扩展空间、系统的自动化测试覆盖率还可以继续提升等。

## 7. 图表与表格替换计划

## 7.1 第3章图表计划

参考模板第3章包含功能结构图、3张用例图和若干需求表。映射到当前项目后，建议如下：

- 图3-1：平台功能结构图
- 图3-2：普通用户用例图
- 表3-1：普通用户功能描述
- 图3-3：超级管理员用例图
- 图3-4：外部调用方用例图
- 表3-2：管理员功能描述
- 表3-3：角色与权限矩阵
- 表3-4：平台核心需求闭环表

## 7.2 第4章图表计划

参考模板第4章包含系统架构图、多个模块流程图和E-R图。映射建议如下：

- 图4-1：系统总体架构图
- 图4-2：用户认证与令牌刷新流程图
- 图4-3：Prompt、Key、Agent配置流程图
- 图4-4：对话处理与消息持久化流程图
- 图4-5：平台API Token公开调用流程图
- 图4-6：OpenAI兼容网关流程图
- 图4-7：MCP服务发现与绑定流程图
- 图4-8：系统E-R图
- 表4-1到表4-7：核心数据表结构
- 表4-8：核心接口清单

## 7.3 第5章图表计划

参考模板第5章图很多。当前项目已经提供真实React前端源码，因此第5章图题可以按“真实页面截图 + 关键交互流程 + 核心代码截图”来重构。初步建议如下：

- 登录页面与JWT认证流程截图
- 仪表盘资源总览与最近7天调用趋势截图
- Prompt管理页面与编辑弹窗截图
- 模型密钥页面与连通性测试结果截图
- 智能体配置页面与MCP绑定界面截图
- 对话页面与流式回复效果截图
- API Token创建页与一次性明文展示截图
- OpenKey管理页与OpenAI兼容调用示例截图
- MCP工具发现结果抽屉截图
- 系统日志查询页与详情抽屉截图
- 用户管理页面与权限控制结果截图
- 系统设置页面截图

## 8. 当前最重要的写作约束

- 前端源码已经提供，正文可以按`core/web`中的真实页面、路由和交互写作，但不能把旧论文稿里的`Next.js`、`TailwindCSS`等旧技术栈直接照搬到当前版本。
- 不要把模板里的“食物、营养、推荐”业务词直接替换成平台词。正文必须重新写。
- 第5章要多写设计逻辑和服务协作，不要写成简单的接口清单。
- 系统安全部分必须写到三件事：JWT认证、Fernet加密、Hash化存储开放密钥。
- 系统开放能力部分必须写到两条通道：`ah_`平台API Token通道和`ok_`OpenKey通道。
- `gateways`、`alerts`、`routes`这类尚未和当前后端主能力强绑定的页面，要先核对其数据来源后再决定是否写入核心功能章节。
- 论文中要突出多用户隔离、工具扩展、日志审计和统一模型接入这四个工程特点。

## 9. 下一步输出计划

- 先生成摘要、关键词、第1章和第2章初稿。
- 再生成第3章需求分析和第4章系统设计。
- 最后生成第5章到第7章，并准备插入模板文档。
- 在正式写入模板前，需要补充论文封面字段，例如姓名、学号、专业、指导教师和完成时间。
