# DeepSeek Harness Agent Replay

[English](README.md) | 简体中文

<p align="center">
  <img src="docs/assets/hero.svg" alt="Agent Replay 将 Harness 会话转换为可回放时间线和脱敏的独立 HTML" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/forrestsweet/dsh-agent-replay/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/forrestsweet/dsh-agent-replay/ci.yml?branch=main&style=flat-square" /></a>
  <a href="https://github.com/forrestsweet/dsh-agent-replay/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/forrestsweet/dsh-agent-replay?style=flat-square&logo=github" /></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2f7d4a?style=flat-square" /></a>
  <a href="https://github.com/topics/dsh-plugin"><img alt="DeepSeek Harness plugin" src="https://img.shields.io/badge/DeepSeek_Harness-plugin-4176e6?style=flat-square" /></a>
</p>

**回放 Agent 真正做过的事情，再导出一个更适合分享的版本。** Agent Replay 为 DeepSeek Harness 增加原生的 **回放** 标签页，把真实会话中的消息、模型回复、工具调用、命令、错误和耗时转换为可搜索时间线，并可导出为独立 HTML 回放。

没有演示假数据，没有外部埋点，也不会在产品里要求用户去 GitHub 点 Star。

## 10 秒看懂

| 回放真实会话 | 生成适合分享的脱敏版本 |
| --- | --- |
| ![DeepSeek Harness 中的回放标签页](docs/assets/replay.png) | ![带隐私摘要和 HTML 导出的分享页](docs/assets/share.png) |

1. 打开任意非空 Harness 会话，选择 **回放**。
2. 搜索、筛选、检查事件，或按记录时间播放。
3. 选择 **生成分享页**，导出一个可交互的 `.html` 文件。

上面的图片来自为本仓库专门创建的真实本地 Harness 会话，不含虚构工具结果或虚构测试结论。

## 为什么需要它

Harness 已经内置了很优秀的开发诊断界面 **Trajectory（轨迹）**。Agent Replay 不替代它，而是补齐分享与沟通这一层：

| | Harness Trajectory | Agent Replay |
| --- | --- | --- |
| 主要目标 | 检查和调试完整事件账本 | 回放并讲清楚一次会话 |
| 主要读者 | Agent 开发者 | 团队成员、维护者、文档读者 |
| 数据 | 原始请求、用量、耗时和事件细节 | 经过选择的消息、工具、命令、错误和耗时 |
| 分享方式 | 产品内诊断 | 脱敏、独立、可交互 HTML |
| 隐私边界 | 完整本地诊断上下文 | 排除系统事件；脱敏常见路径和密钥 |

## 功能

- 原生、会话级 `conversation.view` 标签页
- 完全使用 Harness 真实快照：消息、工具、命令、错误、时间戳与耗时
- 1×、2×、4× 记录时间回放
- 搜索、类型筛选、详情检查、复制和加载更早历史
- 独立 HTML 导出：Trajectory 风格事件账本、概览轨道、详情检查器、深色模式，无运行时依赖
- 分享时排除系统/上下文事件与助手隐藏推理
- 自动脱敏 macOS/Windows 用户路径、常见 Token、Bearer Token 和键值型凭据
- 中英文 UI，跟随 Harness 当前语言
- 复用 Harness 官方组件、语义 Token、尺寸、交互状态、图标与明暗色行为

## 安装

### 从源码安装

要求：Node.js `22.19+`（或 `24+`）、pnpm，以及可正常运行的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。

```bash
git clone https://github.com/forrestsweet/dsh-agent-replay.git
cd dsh-agent-replay
pnpm install
pnpm check
dsh plugin --profile web add .
dsh web
```

打开非空会话，在「对话」和「轨迹」旁选择 **回放**。

### 直接从 GitHub 安装

```bash
dsh plugin --profile web add github:forrestsweet/dsh-agent-replay
```

Git 依赖会执行本仓库的 `prepare` 构建。pnpm 10 可能要求在 profile 的 `pnpm-workspace.yaml` 中明确允许该包构建；请先检查源码，再允许 `dsh-agent-replay` 并重新运行命令。对可复现性有要求时，请固定 commit SHA。细节见 Harness 官方[插件发布指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md#从-github-安装构建脚本这道坎)。

### 移除

```bash
dsh plugin --profile web remove dsh-agent-replay
```

## 隐私模型

Agent Replay 运行在 Harness Web 客户端中，只读取浏览器里已经存在的会话快照，不上传会话内容，也不需要额外模型密钥。

导出 HTML 前会：

- 排除系统/上下文事件以及尚未完成的实时事件；
- 只导出助手最终文本，不导出隐藏推理；
- 替换 `/Users/<name>` 和 `C:\\Users\\<name>` 路径前缀；
- 脱敏常见 GitHub/OpenAI/Slack 形式的 Token、Bearer Token 和凭据赋值。

自动脱敏是安全网，不是绝对保证。公开发布前请人工检查导出文件。若发现脱敏绕过，请按 [SECURITY.md](SECURITY.md) 私下报告，不要创建公开 Issue。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
npm pack --dry-run --ignore-scripts
```

项目结构：

- `src/index.ts`：Harness 宿主端 bundle 入口。
- `src/client/index.tsx`：注册回放视图并渲染会话数据。
- `src/privacy.ts`：经过独立测试的公开事件选择与脱敏逻辑。
- `cordis.patch.yml`：将插件组合进 Harness profile。

UI 明确跟随 DeepSeek Harness 的 `ui-trajectory` 与 `ui-primitives`。贡献代码应优先复用 Harness 官方组件和 `--dsw-*` 语义 Token，不另造一套视觉系统。

## 兼容性

当前版本面向 DeepSeek Harness `0.1.0-rc.5+`，并使用 `0.1.0-rc.6` 开发依赖验证。Harness 仍处于 1.0 之前，客户端 slot 或快照契约可能变化。兼容问题请同时提供 Harness 与插件版本。

## 路线图

- [ ] 签名 Release 压缩包与 npm 分发
- [ ] 用户可配置的脱敏规则
- [ ] 分享预览中的字段级内容选择
- [ ] 明暗模式导出视觉基线测试
- [ ] 后续 Harness 版本兼容矩阵

## 社区与官方发现路径

DeepSeek Harness 当前文档给出的社区插件发现方式是 [`dsh-plugin`](https://github.com/topics/dsh-plugin) GitHub Topic、[GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 和 [Discord 社区](https://discord.gg/Ycq5dCaS4)。本仓库会按这条路径完善；目前官方没有记录单独的插件市场提交流程。

欢迎提交 Issue 和 PR。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，版本记录见 [CHANGELOG.md](CHANGELOG.md)。

如果 Agent Replay 让你的 Harness 会话更容易理解或分享，一个 GitHub Star 能帮助更多 Harness 用户发现它。

## 许可证

[MIT](LICENSE) © Agent Replay contributors.
