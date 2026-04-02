# Claude Code 代码结构分析
## 整体架构
Claude Code 是一个功能丰富的命令行工具，具有模块化的代码结构。以下是对其代码结构的详细分析：

## 主要目录结构
### 1. src/ - 主源代码目录
- bootstrap/ - 启动相关代码，包含状态管理
- bridge/ - 与外部系统通信的桥梁，包含 API 接口、配置管理、消息传递等
- buddy/ - 伙伴功能相关代码，包含 CompanionSprite 组件
- cli/ - 命令行界面核心代码，包含各种处理器
- commands/ - 丰富的命令实现，按功能分类
- components/ - React UI 组件
- constants/ - 常量定义
- context/ - 上下文管理
- entrypoints/ - 应用入口点
- hooks/ - React 自定义钩子
- ink/ - 终端 UI 库相关代码
### 2. 核心模块分析 Bridge 模块
bridge/ 目录包含与外部系统通信的核心代码，包括：
- bridgeApi.ts - API 接口定义
- bridgeMain.ts - 主桥接逻辑
- bridgeMessaging.ts - 消息传递机制
- replBridge.ts - REPL 环境桥接
- sessionRunner.ts - 会话运行器 CLI 模块
cli/ 目录包含命令行界面的核心实现：

- handlers/ - 各种命令处理器
- remoteIO.ts - 远程 IO 操作
- structuredIO.ts - 结构化 IO 处理 Commands 模块
commands/ 目录包含大量命令实现，按功能分类：

- agents/ - 代理相关命令
- bridge/ - 桥接相关命令
- config/ - 配置相关命令
- login/ - 登录相关命令
- model/ - 模型相关命令
- session/ - 会话相关命令
- 等等... Components 模块
components/ 目录包含 React UI 组件：

- App.tsx - 主应用组件
- Message.tsx - 消息组件
- Messages.tsx - 消息列表组件
- TextInput.tsx - 文本输入组件
- 等等... Entrypoints 模块
entrypoints/ 目录包含应用的不同入口点：

- cli.tsx - 命令行界面入口
- init.ts - 初始化入口
- mcp.ts - 可能是主控制面板入口
### 3. 技术栈分析
- 前端技术 ：React、TypeScript、Ink (终端 UI 库)
- 后端技术 ：Node.js
- 架构模式 ：模块化、组件化、命令模式
### 4. 核心功能分析
1. 命令行交互 ：通过 cli/ 和 commands/ 模块实现丰富的命令行功能
2. 外部系统集成 ：通过 bridge/ 模块与外部系统通信
3. 用户界面 ：通过 components/ 和 ink/ 模块实现终端 UI
4. 会话管理 ：通过 bridge/sessionRunner.ts 和 commands/session/ 模块管理会话
5. 配置管理 ：通过 commands/config/ 模块管理配置
### 5. 关键文件
- src/entrypoints/cli.tsx - 命令行界面的主入口
- src/bridge/bridgeMain.ts - 桥接功能的核心实现
- src/commands.ts - 命令注册和管理
- src/components/App.tsx - 主应用组件
- src/QueryEngine.ts - 查询引擎
- src/Task.ts - 任务管理
## 总结
Claude Code 采用了模块化、组件化的架构设计，具有以下特点：

1. 功能丰富 ：包含大量命令和功能模块
2. 架构清晰 ：按功能划分为不同的模块
3. 技术先进 ：使用 React、TypeScript 等现代前端技术
4. 扩展性强 ：模块化设计使得扩展新功能变得容易
5. 多入口点 ：支持不同的启动方式和使用场景
这种架构设计使得 Claude Code 能够提供丰富的功能，同时保持代码的可维护性和可扩展性。



==============1.参照claude-code文件夹代码结构，在根目录逐步实现客户端功能，
首先先实现CLI基础功能，实现输入输出，后端的实际功能先留空，返回字符串。


==============2.参照claude-code文件夹代码结构，在根目录逐步实现客户端功能，
实现ink的UI库，展示一个简单的UI界面

我已经参照 claude-code 文件夹的代码结构，实现了 ink UI 库的基本功能，并创建了一个简单的 UI 界面。以下是完成的工作：
## 项目结构
├── src/
│   ├── entrypoints/
│   │   ├── cli.js          # 原始 CLI 入口点
│   │   └── cli-ink.js      # Ink UI 版本的 CLI 入口点
│   ├── cli/
│   │   └── structuredIO.js  # 结构化 IO 处理
│   ├── ink/
│   │   └── components/
│   │       ├── App.js       # Ink 主应用组件
│   │       ├── Box.js       # 布局组件
│   │       └── Text.js      # 文本组件
│   ├── commands.js          # 命令注册和执行
│   └── ink.js              # Ink 模块入口
├── package.json            # 项目配置
└── README.md              # 项目说明
## 实现的功能
1. Ink UI 库集成 ：
   
   - 添加了 ink、react 和 react-dom 依赖
   - 创建了基本的 ink 组件（Text、Box、App）
   - 实现了一个简单的欢迎界面
2. UI 界面 ：
   
   - 显示欢迎信息和标题
   - 提示用户输入消息
   - 显示可用命令列表
   - 居中布局，美观大方
3. 新的入口点 ：
   
   - 创建了 cli-ink.js 文件，用于启动 Ink UI 版本的 CLI
   - 添加了 start:ink 脚本命令

==============3.参照claude-code文件夹目录，根据输入输出的核心功能，完整实现最终的关键功能，注意代码框架
# Claude Code 输入输出功能实现分析
## 核心实现文件
Claude Code 的输入输出功能主要在以下文件中实现：
### 1. src/components/PromptInput/PromptInput.tsx
这是处理用户输入的主组件，包含以下功能：
- 命令解析和执行
- 输入处理和验证
- 消息显示和管理
- 键盘快捷键处理
### 2. src/components/TextInput.tsx
负责文本输入的显示和光标管理：
- 文本显示和高亮
- 光标移动和渲染
- 语音输入支持
### 3. src/hooks/useTextInput.ts
处理文本输入的核心逻辑：
- 光标移动和文本编辑
- 快捷键处理
- 历史记录管理
- 剪贴板操作
### 4. src/utils/Cursor.ts
处理文本光标和编辑操作：
- 光标移动
- 文本插入和删除
- 文本选择
- 剪贴板操作

## 输入输出流程
1. 输入捕获 ：通过 useInput 钩子捕获用户键盘输入
2. 输入处理 ：根据输入类型（普通字符、特殊键、快捷键）执行不同处理
3. 命令解析 ：解析输入的命令，如 /help 、 /exit 等
4. 命令执行 ：执行相应的命令逻辑
5. 输出显示 ：将执行结果显示在终端界面上
6. 历史记录 ：将输入和输出添加到历史记录中

## 关键功能
1. 命令解析 ：识别以 / 开头的命令并执行
2. 历史记录 ：支持上下箭头浏览历史命令
3. 快捷键 ：支持各种编辑快捷键，如 Ctrl+C、Ctrl+D、Esc 等
4. 光标管理 ：支持光标移动、文本选择等操作
5. 语音输入 ：支持语音输入功能


src/
├── entrypoints/
│   └── cli.js          # CLI 入口文件
├── hooks/
│   └── useTextInput.js # 文本输入处理钩子
├── utils/
│   └── Cursor.js       # 光标管理工具
├── commands.js         # 命令管理
└── history.js          # 历史记录管理
## 核心功能实现
### 1. 命令解析和执行
- 实现了命令注册和执行系统
- 支持以 / 开头的命令，如 /help 、 /exit 、 /clear 、 /history
- 可扩展的命令系统，支持添加新命令
### 2. 输入处理和验证
- 实现了完整的文本输入处理
- 支持光标移动（左右箭头）
- 支持删除操作（退格键、删除键）
- 支持历史记录浏览（上下箭头）
### 3. 快捷键支持
- Ctrl+C：清空输入或退出程序
- Ctrl+D：删除字符或退出程序
- Ctrl+K：删除到行尾
- Ctrl+U：删除到行首
- Ctrl+W：删除前一个单词
- Ctrl+Y：粘贴
- Alt+Y：循环粘贴
### 4. 历史记录管理
- 自动保存输入历史
- 支持上下箭头浏览历史
- 限制历史记录长度为 100 条
### 5. 光标管理
- 实现了完整的光标移动和编辑功能
- 支持文本插入、删除操作
- 支持选区操作和剪贴板功能
## 实现细节
### Cursor 类
- 处理文本光标和编辑操作
- 支持光标移动、文本插入、删除等功能
- 提供删除到行尾、行首、前一个单词等高级编辑功能
### useTextInput 钩子
- 处理文本输入的核心逻辑
- 支持各种快捷键和编辑操作
- 管理光标状态和文本内容
### 命令系统
- 可扩展的命令注册机制
- 支持命令参数解析
- 内置了常用命令：help、exit、clear、history
### 历史记录系统
- 自动保存输入历史
- 支持历史记录浏览和管理
- 提供历史记录查询功能
## 使用方法
1. 启动客户端： npm start
2. 输入普通文本，按回车发送
3. 输入命令，如 /help 查看帮助
4. 使用上下箭头浏览历史记录
5. 使用快捷键进行编辑操作
6. 输入 /exit 退出程序
## 扩展建议
1. 添加更多命令，如文件操作、网络请求等
2. 实现更高级的编辑功能，如文本选择、搜索替换等
3. 添加语法高亮和自动补全功能
4. 支持配置文件，允许用户自定义设置
5. 实现插件系统，支持功能扩展


==============4.参考claude-code文件夹内的项目架构，优化下当前项目的commands.js模块，形成方便扩展的命令模块

src/
├── commands/
│   ├── help/
│   │   └── index.js      # 帮助命令实现
│   ├── exit/
│   │   └── index.js      # 退出命令实现
│   ├── clear/
│   │   └── index.js      # 清屏命令实现
│   └── history/
│       └── index.js      # 历史命令实现
├── entrypoints/
│   ├── cli.js          # CLI 入口
│   ├── cli-ink.js      # Ink UI 入口
│   └── ink.js          # Ink 模块入口
├── hooks/
│   └── useTextInput.js # 文本输入处理
├── ink/
│   └── components/
│       ├── App.js      # Ink 主应用
│       ├── Box.js      # 布局组件
│       └── Text.js     # 文本组件
├── utils/
│   └── Cursor.js       # 光标管理
├── commands.js         # 命令系统核心
└── history.js          # 历史记录管理

==============4.参考claude-code文件夹内的项目架构，检查一下创建本地文件的功能位置，
并参照该模块的架构开发创建文件的功能，并注册命令
src/
├── commands/
│   ├── touch/
│   │   └── index.js      # 创建文件命令
│   ├── write/
│   │   └── index.js      # 写入文件命令
│   ├── help/
│   │   └── index.js      # 帮助命令
│   ├── exit/
│   │   └── index.js      # 退出命令
│   ├── clear/
│   │   └── index.js      # 清屏命令
│   └── history/
│       └── index.js      # 历史命令
└── ...
/touch file1.txt file2.txt
/write hello.txt Hello, world!

==============5.参考claude-code文件夹内的项目架构，检查一下定时任务功能实现过程，
并参照该模块的架构开发定时任务功能，要求定时任务能够管理

# 定时任务功能实现完成
我已经参照 claude-code 文件夹内的项目架构，成功实现了定时任务功能。以下是实现的内容：

## 核心功能实现
1. 定时任务工具模块 ：
   
   - src/utils/cron.js - 实现了 cron 表达式解析、下一次执行时间计算和人类可读格式转换
   - src/utils/cronTasks.js - 实现了定时任务的存储、读取、添加和删除操作
   - src/utils/cronScheduler.js - 实现了定时任务的调度功能，包括任务执行和管理
2. 定时任务命令 ：
   
   - /cron:create <cron> <prompt> - 创建一个定时任务
   - /cron:delete <task_id> - 删除一个定时任务
   - /cron:list - 列出所有定时任务
3. 集成到 CLI 客户端 ：
   
   - 在主 CLI 入口文件中初始化和启动定时任务调度器
   - 在程序退出时停止调度器，确保资源正确清理
使用示例
创建定时任务
> /cron:create 0 * * * * /write system.log System check at {timestamp}
> /cron:create 0 0 * * * /write backup.log Backup completed at {datetime}
/cron:create * * * * * /write time.log System check at {timestamp}
/cron:create * * * * * /write time.log Current time at {datetime}
列出定时任务
> /cron:list
Scheduled Tasks:

1. ID: cron_1711993200000_abc123
   Cron: */5 * * * * (Every 5 minutes)
   Prompt: 每5分钟执行一次
   Created: 2026-04-01 12:00:00
   Type: Recurring

删除定时任务
> /cron:delete cron_1711993200000_abc123
Deleted scheduled task: cron_1711993200000_abc123




## 技术特点
- 标准 cron 表达式支持 ：支持 5 字段 cron 表达式，包括通配符、范围、步长等语法
- 任务持久化 ：定时任务存储在 .claude/scheduled_tasks.json 文件中，程序重启后仍然有效
- 自动执行 ：定时任务会在指定的时间自动执行，并显示任务的提示信息
- 任务管理 ：支持创建、删除和列出定时任务，方便用户管理


# CLI 和 CLI:Ink 输入处理流程对比
## 普通 CLI 模式
### 输入处理流程
1. 入口文件 ： src/entrypoints/cli.js
2. 初始化 ：
   - 创建 readline 接口
   - 初始化 input 变量
   - 调用 useTextInput 创建输入处理状态
3. 事件监听 ：
   - 监听 process.stdin 的 keypress 事件
   - 调用 handleInput 函数处理输入
4. 输入处理 ：
   - handleInput 函数将 Node.js keypress 事件的 key 对象转换为 useTextInput 预期的格式
   - 调用 textInputState.handleInput 处理输入
   - useTextInput.handleInput 根据输入类型执行不同操作（普通字符、特殊键等）
   - 调用 onChange 回调函数更新输入状态
   - 重新显示提示符和输入内容，移动光标到正确位置
5. 提交处理 ：
   - 当用户按回车键时，调用 onSubmit 回调函数
   - handleSubmit 函数处理提交的内容，执行命令或显示输入内容
   - 重置输入和光标状态，重新显示提示符

process.stdin.on('keypress') → handleInput() → textInputState.handleInput() → onChange() → process.stdout.write()


## Ink UI 模式
### 输入处理流程
1. 入口文件 ： src/entrypoints/cli-ink.js → src/entrypoints/ink.js
2. 初始化 ：
   - 渲染 App 组件
   - App 组件使用 useState 管理输入内容、消息历史等状态
   - 调用 useInput hook 处理输入
3. 事件监听 ：
   - useInput hook 监听终端输入事件
   - 调用 handleInput 函数处理输入
4. 输入处理 ：
   - handleInput 函数将 Ink 的 useInput 事件转换为 useTextInput 预期的格式
   - 调用 textInputState.handleInput 处理输入
   - useTextInput.handleInput 根据输入类型执行不同操作（普通字符、特殊键等）
   - 调用 setInput 更新输入状态
   - 组件重新渲染，显示更新后的输入内容和光标
5. 提交处理 ：
   - 当用户按回车键时，调用 handleSubmit 函数
   - 处理提交的内容，执行命令或显示输入内容
   - 重置输入状态，添加消息到历史记录

useInput() → handleInput() → textInputState.handleInput() → setInput() → component re-render


## 主要区别
1. 事件处理机制 ：
   
   - 普通 CLI 模式：使用 Node.js 原生的 keypress 事件
   - Ink UI 模式：使用 Ink 库的 useInput hook
2. 状态管理 ：
   
   - 普通 CLI 模式：使用全局变量 input 存储输入内容
   - Ink UI 模式：使用 React 的 useState hook 管理输入内容
3. 渲染方式 ：
   
   - 普通 CLI 模式：使用 process.stdout.write 直接写入终端
   - Ink UI 模式：使用 React 组件渲染，由 Ink 库处理终端绘制
4. 光标处理 ：
   
   - 普通 CLI 模式：使用 process.stdout.cursorTo 手动移动光标
   - Ink UI 模式：由 Ink 库自动处理光标位置
5. 命令执行 ：
   
   - 普通 CLI 模式：直接调用 executeCommand 函数
   - Ink UI 模式：通过 React 状态更新和组件渲染处理命令执行结果
6. 服务管理 ：
   
   - 普通 CLI 模式：直接初始化和管理服务
   - Ink UI 模式：在组件的 useEffect 钩子中初始化和管理服务


==============5.参考claude-code文件夹内的项目架构，检查一下日志输出功能模块，
并参照该模块的架构开发日志输出功能，如果没有就在utils文件夹下实现一个统一的功能，要求项目有一个公共的日志模块来打印日志






==============6.参考claude-code文件夹内的QueryEngine.ts功能架构，
查询引擎是 Claude Code 的核心运行时，负责管理「用户输入 → 模型调用 → 工具执行 → 结果返回」的完整循环。
它是一个 **async generator** 架构，通过 `yield` 向调用方推送流式事件，通过 `return` 返回终止原因
参照该功能结构实现查询引擎，后面查询的SDK会对接不同的AI厂家，需要预留接口
QueryEngine.ts (SDK/print 入口)
  └─→ query.ts::query() (async generator 包装器)
        └─→ queryLoop() (while(true) 主循环)
              ├── Phase 1: 上下文准备 (压缩管线)
              ├── Phase 2: API 调用 (流式接收)
              ├── Phase 3: 工具执行 (并发/串行编排)
              ├── Phase 4: 停止钩子 (post-turn 处理)
              └── Phase 5: 继续/终止判定

src/
├── types/
│   └── message.js          # 消息类型定义
├── services/
│   └── api/
│       ├── claude.js       # API 调用实现
│       └── errors.js       # 错误处理
├── tools/
│   └── ExampleTool.js      # 示例工具
├── QueryEngine.js          # 查询引擎核心类
├── Tool.js                 # 工具定义和工具使用上下文
├── query.js                # 查询循环实现
└── index.js                # 示例入口

## 核心功能实现
1. 异步生成器架构 ：使用 async generator 模式，通过 yield 向调用方推送流式事件
2. 完整的查询循环 ：
   - 上下文准备和压缩
   - API 调用和流式接收
   - 工具执行和结果处理
   - 停止钩子和后处理
   - 继续/终止判定
3. 工具系统 ：支持自定义工具的注册和执行
4. 错误处理 ：包括 API 错误、工具执行错误等
5. 预算管理 ：支持最大轮次和预算限制
6. 可扩展性 ：预留了接口以支持不同的 AI 厂家 SDK 对接
## 关键类和函数
- QueryEngine ：核心引擎类，管理整个查询生命周期
- query ：查询循环实现，处理消息流和工具执行
- Tool ：工具基类，定义工具接口
- ToolUseContext ：工具使用上下文，提供工具执行所需的环境


// 使用便捷函数
for await (const message of ask({
  prompt: 'Hello, can you use the example tool to greet John?',
  tools: [exampleTool],
  canUseTool: async () => ({ behavior: 'allow' })
})) {
  // 处理消息
}

// 直接使用 QueryEngine 类
const engine = new QueryEngine({
  tools: [exampleTool],
  canUseTool: async () => ({ behavior: 'allow' })
});

for await (const message of engine.submitMessage('Can you use the example tool again to greet Jane?')) {
  // 处理消息
}


必要前提：
1.不需要自动运行，主机有加密系统，无法正常运行程序，等待我自己验证即可
2.全局使用ES 模块语法
3.在设计结构时需要先参考claude-code文件夹的项目架构，寻找相似的结构进行参考设计

当前需求：
现在对话好像正常了，开始实现一个豆包AI的服务，接入到统一的ai模块中，方便切换，豆包相关的api-key留空，从配置文件读取

"doubao": {
 "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
 "model": "doubao-seed-2-0-pro-260215"
},

==============7.
必要前提：
本次只做架构分析

当前需求：
检查claude-code程序目录，分析AI通过对话调用本地工具（commands）是如何实现的，
给出符合本项目的架构设计以及开发模块的详细拆解，方便后续逐步完成


## Claude-Code 项目架构分析
### 核心架构组件 1. 命令系统 ( src/commands/ )
- 每个命令都是一个独立的模块，放在 src/commands/ 目录下
- 命令有三种类型：
  - local : 本地命令，直接在本地执行
  - local-jsx : 使用Ink UI的本地命令
  - prompt : 提示词命令，生成提示词发送给AI 2. 命令注册表 ( src/commands.ts )
- 导入所有命令并统一管理
- 提供 getCommands() 函数获取所有可用命令
- 支持多种命令来源：内置命令、技能目录命令、插件命令、工作流命令等 3. 工具系统 ( src/Tool.ts )
- 定义了 Tool 接口，所有工具必须实现这个接口
- 提供 buildTool() 函数创建工具，提供默认值
- 工具负责执行具体的操作，返回结果给AI 4. 查询引擎 ( src/QueryEngine.ts )
- 管理整个对话生命周期
- 维护会话状态（消息、文件缓存、用量等）
- 调用 query() 函数执行实际的对话流程 5. 查询循环 ( src/query.ts )
- 核心对话循环实现
- 处理AI响应，检测工具调用
- 调用工具执行器执行工具
- 处理工具结果，继续对话 6. 工具执行器 ( src/services/tools/ )
- toolOrchestration.ts : 工具编排，管理工具的执行
- StreamingToolExecutor.ts : 流式工具执行器，支持并发执行多个工具

用户输入
    ↓
processUserInput() - 处理用户输入，检测命令
    ↓
QueryEngine.submitMessage() - 启动查询
    ↓
query() - 核心查询循环
    ↓
调用AI API - 发送消息给AI
    ↓
检测工具调用 - 检查AI响应中的tool_use
    ↓
runTools() - 执行工具
    ↓
工具返回结果 - 将结果返回给AI
    ↓
继续循环 - 直到AI返回最终结果


### 模块开发拆解 阶段一：基础架构
1. 创建命令类型定义 ( src/types/command.js )
   
   - 定义 Command 接口
   - 支持命令类型： local 、 prompt
   - 包含命令元数据：name、description、aliases等
2. 创建工具类型定义 ( src/types/tool.js )
   
   - 定义 Tool 接口
   - 包含：call()、inputSchema、description()等方法
   - 定义 ToolUseContext 接口
3. 创建工具构建器 ( src/tools/buildTool.js )
   
   - 提供 buildTool() 函数
   - 为工具提供默认值
   - 简化工具创建 阶段二：核心服务
4. 创建命令注册表 ( src/services/commands.js )
   
   - 导入并注册所有命令
   - 提供 getCommands() 函数
   - 提供 findCommand() 函数
5. 创建工具注册表 ( src/services/tools.js )
   
   - 导入并注册所有工具
   - 提供 getTools() 函数
   - 提供 findToolByName() 函数
6. 创建工具执行器 ( src/services/toolExecutor.js )
   
   - 实现 executeTool() 函数
   - 处理工具输入验证
   - 处理工具权限检查
   - 执行工具并返回结果 阶段三：集成到查询流程
7. 修改 QueryEngine.js
   
   - 集成命令和工具
   - 更新配置，传入commands和tools
   - 初始化工具上下文
8. 修改 query.js
   
   - 集成工具执行器
   - 检测AI响应中的工具调用
   - 调用工具执行器执行工具
   - 将工具结果返回给AI 阶段四：实现具体命令和工具
9. 实现Read命令和工具
   
   - src/commands/read/index.js : 命令定义
   - src/tools/ReadTool.js : 工具实现
   - 支持读取文件内容
10. 实现Write命令和工具
    
    - src/commands/write/index.js : 命令定义
    - src/tools/WriteTool.js : 工具实现
    - 支持写入文件内容
11. 实现Edit命令和工具
    
    - src/commands/edit/index.js : 命令定义
    - src/tools/EditTool.js : 工具实现
    - 支持编辑文件内容
12. 实现Search命令和工具
    
    - src/commands/search/index.js : 命令定义
    - src/tools/SearchTool.js : 工具实现
    - 支持搜索文件内容 阶段五：增强功能
13. 添加命令帮助系统
    
    - 实现 help 命令
    - 显示所有可用命令
    - 显示命令详细说明
14. 添加工具搜索功能
    
    - 实现工具搜索提示词
    - 帮助AI选择合适的工具
    - 提供工具使用说明
15. 添加工具使用统计
    
    - 记录工具使用次数
    - 记录工具执行时间
    - 显示工具使用统计

## 关键实现要点
### 1. 工具与AI的交互
- AI通过 tool_use 调用工具
- 工具返回 tool_result 给AI
- AI根据工具结果继续对话
### 2. 命令与工具的关系
- 命令：用户直接调用的功能（如 /read file.txt ）
- 工具：AI可以自动调用的功能（如通过对话让AI读文件）
- 两者可以共享底层实现
### 3. 工具执行流程
### 4. 系统提示词集成
- 在系统提示词中描述所有可用工具
- 告诉AI如何使用工具
- 提供工具使用示例



==============8.
必要前提：
1.不需要自动运行，主机有加密系统，无法正常运行程序，等待我自己验证即可
2.全局使用ES 模块语法
3.在设计结构时需要先参考claude-code文件夹的项目架构，寻找相似的结构进行参考设计

当前需求：
现在终端可以使用 /command 调用工具，当前需求是实现AI也能够实现底层工具的调用功能。
参考claude-code文件夹内设计思路
## 关键实现要点
### 1. 工具与AI的交互
- AI通过 tool_use 调用工具
- 工具返回 tool_result 给AI
- AI根据工具结果继续对话
### 2. 命令与工具的关系
- 命令：用户直接调用的功能（如 /read file.txt ）
- 工具：AI可以自动调用的功能（如通过对话让AI读文件）
- 两者可以共享底层实现


==============9.
必要前提：
1.不需要自动运行，主机有加密系统，无法正常运行程序，等待我自己验证即可
2.全局使用ES 模块语法
3.在设计结构时需要先参考claude-code文件夹的项目架构，寻找相似的结构进行参考设计

当前需求：

