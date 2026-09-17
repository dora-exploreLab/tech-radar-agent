<div align="center">

```
   _______        _     ____           _             
  |__   __|      | |   |  _ \         | |            
     | | ___  ___| |__ | |_) | __ _  __| | __ _ _ __  
     | |/ _ \/ __| '_ \|  _ < / _` |/ _` |/ _` | '__| 
     | |  __/ (__| | | | |_) | (_| | (_| | (_| | |    
     |_|\___|\___|_| |_|____/ \__,_|\__,_|\__,_|_|    
```

# 📡 TechRadar-Agent (全自动前沿技术雷达智能体)

> ⚡ **面向高信噪比极客的自主技术雷达智能体与知识沉淀脚手架**  
> 全天候追踪 GitHub 爆款热榜、顶会学术论文、大厂工程快讯与经典图书，深度提炼结构化知识并自动化沉淀至 Markdown 知识库。

[English](README.md) | **简体中文**

[![GitHub Repo](https://img.shields.io/badge/GitHub-dora--exploreLab%2Ftech--radar--agent-blue?logo=github)](https://github.com/dora-exploreLab/tech-radar-agent)
[![CI](https://github.com/dora-exploreLab/tech-radar-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dora-exploreLab/tech-radar-agent/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/dora-exploreLab/tech-radar-agent?color=brightgreen)](https://github.com/dora-exploreLab/tech-radar-agent/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg?logo=nodedotjs)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## 💡 为什么选择 TechRadar-Agent？

| 评估维度 | 传统面向过程爬虫脚本 | ⚡ TechRadar-Agent 智能体基座 |
| :--- | :--- | :--- |
| **工程架构** | 单文件过程式代码，抓取、清洗与写入高度耦合 | **现代化 Agent Harness 架构**，基于状态机与统一 `act()` 动作中枢调度 |
| **智能提炼** | 粗暴字符串截取或简单的非结构化 Prompt 调用 | **Zod Schema 强类型契约**，结构化推理 + Critic 自检自纠错闭环 |
| **容错自愈** | 遇网络抖动或接口变动直接崩溃中断 | **指数退避重试 + 多级熔断降级 (Fallback)**，保障无人值守 0 断点 |
| **网络路由** | 代理端口硬编码（易被 WAF 封禁或无法连外网） | **智能分流路由**：国内权威技术源直连防 WAF，海外流量接入 Clash/HTTP 隧道 |
| **去重体系** | 本地脆弱的 txt/json 缓存，无时间窗口冷却 | **`IDedupStore` 多数仓适配**：PostgreSQL 16 企业级数仓 / SQLite 单机即开即用 |
| **知识沉淀** | 凌乱无规则排版，手动复制粘贴 | **极客规范排版引擎**：大项汉字序号、1.1/1.2层级、核心看点三层展开、原生无缝同步 Obsidian |

---

## 🏛️ 智能体 Harness 认知闭环拓扑

```mermaid
flowchart TD
    subgraph AgentHarness["TypeScript AgentHarness (执行中枢)"]
        direction TB
        subgraph PerceivePhase["1. 感知层 (Perceive)"]
            P1["多源全网感知探测 (GitHub Trending / ArXiv / 权威博客 / 经典书库)"]
        end
        subgraph ThinkPhase["2. 思考层 (Think)"]
            T1["大模型认知推理 (Zod 强类型结构化输出)"]
        end
        subgraph ActPhase["3. 行动中枢 (Act Dispatcher)"]
            A0["harness.act(actionName, payload, executor)"]
            A1["actFetch: 智能分流抓取 (国内直连/海外代理)"]
            A2["actDedupCheck: 数仓唯一索引查重 (14天冷却期)"]
            A3["actReasonAndExtract: 领域价值三层提炼"]
            A4["actFormatTypography: 极客排版规范渲染"]
            A5["actPersistAssets: 元数据原子提交入库"]
            A6["actWriteObsidian: 知识库落地与待办打卡"]
        end
        subgraph ReflectPhase["4. 反思自检 (Reflect & Heal)"]
            R1["reflect(): 标题字数与深度 Critic 自动追问重试"]
            R2["fallback(): 网络与接口抖动多级熔断兜底"]
        end
    end
    
    P1 --> T1
    T1 --> A0
    A0 --> A1 & A2 & A3 & A4 & A5 & A6
    A3 --> R1
    R1 -.->|自省未通过| A3
    A0 -.->|异常捕获| R2
```

---

## 🚀 快速上手 (Quick Start)

### 1. 安装环境与依赖
推荐使用 [pnpm](https://pnpm.io/) 进行秒级安装：
```bash
git clone https://github.com/dora-exploreLab/tech-radar-agent.git
cd tech-radar-agent
pnpm install
pnpm build
```

### 2. 配置环境变量 (`.env`)
复制项目模板并配置你的环境：
```bash
cp .env.example .env
```
主要核心配置项：
```env
# 🤖 大模型配置 (兼容 OpenAI / DeepSeek / Ollama)
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your_deepseek_api_key_here
LLM_MODEL=deepseek-chat

# 🗄️ 存储数仓 (可选 "postgres"、"sqlite" 或 "memory")
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/crawler_db
SQLITE_PATH=./data/radar.db

# 🔌 网络代理 (可选 "auto" 智能分流、"always" 全局代理、"never" 直连)
PROXY_MODE=auto
PROXY_URL=http://127.0.0.1:7897

# 📚 Obsidian / Markdown 知识库根目录
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian/vault
```

---

## 💻 CLI 命令速查手册 (CheatSheet)

| 命令示例 | 说明 |
| :--- | :--- |
| `pnpm start:daily` | 执行今日全量技术雷达采集、提炼并落盘至知识库 |
| `pnpm dev status` | 体检底层基础设施（PostgreSQL/网络代理/LLM/Vault 连接状态） |
| `pnpm dev run -d 2026-09-16` | 补抓指定历史日期的技术雷达数据 |
| `pnpm dev run --driver sqlite` | 临时使用 SQLite 单机数仓运行（免配 Docker） |
| `pnpm dev run --no-proxy` | 强制使用直连模式，不走任何外部代理隧道 |
| `pnpm typecheck` | 执行 TypeScript 全量静态类型死锁检查 |
| `pnpm test` | 执行排版契约、网络路由与数据存储 12 项单元测试 |

---

## 🎨 极客排版规范输出效果预览

生成的技术快讯严格遵循极客审美契约：

```markdown
# ⚡ 2026-09-17 (星期四) 全栈技术前沿快讯 (高信噪比精选)

## 一、GitHub 今日爆款开源热榜

### 1.1 FastChat (lm-sys/FastChat)
- **今日新增 Star**: +2,150 | **主要语言**: Python | **项目定位**: 大模型训练与评测开源平台
- **核心看点**: 
  - 针对多模型统一推理接入痛点，构建了高并发分布式 Controller 架构；
  - 深度支持分布式批处理与量化推理，大幅降低显存占用；
  - **💡 工程借鉴**: 在智能体网关层采用抽象适配器模式，平滑屏蔽底层多模型协议差异。
```

---

## 🧩 扩展开发：3 步新增数据源

1. **新建任务类**：在 `src/tasks/` 下新建 `my_task.ts`，继承 `BaseTask`：
   ```ts
   import { BaseTask } from "./base.js";
   import { RuntimeContext } from "../core/context.js";

   export class MyTask extends BaseTask {
     readonly taskType = "my_custom_source" as any;
     readonly description = "我的自定义技术情报源";

     async execute(context: RuntimeContext): Promise<void> {
       const items = await this.harness.act("fetch", { ... }, async () => { ... });
       // 查重、AI提炼与落地...
     }
   }
   ```
2. **注册至调度流水线**：在 `src/core/agent.ts` 中注册你的新任务。
3. **启用配置**：在 `.env` 中添加你的任务名即可！

---

## 🤝 参与贡献 (Contributing)

热烈欢迎提交 Issue 与 Pull Request！请查阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发规范与提交流程。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 协议完全开源。