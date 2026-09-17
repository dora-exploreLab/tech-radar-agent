# 📡 tech-radar-agent (全自动前沿技术雷达智能体)

> ⚡ **Autonomous Tech Radar & Knowledge Distillation Agent Harness**  
> 面向高信噪比极客的自主技术雷达智能体与知识沉淀脚手架。具备感知、深度思考、统一动作派发与自省自愈能力，支持全域配置彻底解耦、多数仓驱动切换与 Obsidian 自动化归档。

[![GitHub Repo](https://img.shields.io/badge/GitHub-dora--exploreLab%2Ftech--radar--agent-blue?logo=github)](https://github.com/dora-exploreLab/tech-radar-agent)
[![CI](https://github.com/dora-exploreLab/tech-radar-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dora-exploreLab/tech-radar-agent/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/dora-exploreLab/tech-radar-agent?color=brightgreen)](https://github.com/dora-exploreLab/tech-radar-agent/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-green.svg?logo=nodedotjs)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏛️ 智能体 Harness 认知闭环拓扑

```mermaid
flowchart TD
    subgraph AgentHarness["TypeScript AgentHarness (执行中枢)"]
        direction TB
        subgraph PerceivePhase["1. 感知层 (Perceive)"]
            P1["网络多源探测 (GitHub / ArXiv / 大厂RSS / 好书智库)"]
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

## ✨ 核心特性

1. **工业级 Agent Harness 架构**：
   - 彻底告别粗暴的单次 API 调用，建立包含 `actFetch`、`actDedupCheck`、`actReasonAndExtract` 等 8 大动作族的统一派发器；
   - 内建 Telemetry 耗时追踪、指数退避重试与自动降级（Fallback）机制。
2. **全域参数彻底解耦 (Zero Hardcoding)**：
   - **网络路由解耦**：彻底告别端口写死，支持 HTTP/HTTPS/SOCKS5 任意代理（支持 `auto` 智能分流、`always` 全局代理、`never` 直连）；
   - **多存储驱动适配**：基于 `IDedupStore` 接口，支持 `postgres`（企业级数仓）与 `sqlite`（轻量单机开箱即用，免装 Docker）一键切换；
   - **排版主题解耦**：大项大写序号、子项 `1.1/1.2` 编号、指标加粗独立下行、核心看点三层展开、文案替换全部可配置。
3. **Markdown 知识库自动化沉淀**：
   - 自动生成符合规范的 YAML Frontmatter 元数据；
   - 全自动按分类归档技术快讯、顶会论文、技术专栏与经典好书；
   - 原生适配 Obsidian、Logseq、Notion 等主流本地知识库。
4. **极客 CLI 与双端兼容**：
   - 高颜值命令行控制台；
   - 原生支持 Windows 宿主机与 WSL2 Linux 双端无缝运行。

---

## 🚀 快速开始

### 1. 安装依赖与构建

```bash
# 安装依赖 (推荐 pnpm)
pnpm install

# 构建打包
pnpm build
```

### 2. 环境配置 (`.env`)

复制环境配置模板并填写必要参数：
```bash
cp .env.example .env
```

```env
# 基础大模型配置 (支持 DeepSeek / OpenAI / Ollama 等兼容协议)
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-your-key-here
LLM_MODEL=deepseek-chat

# 存储数仓 (可选 "postgres" 或 "sqlite")
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/crawler_db

# 网络代理与分流 (留空或配置任意端口)
PROXY_MODE=auto
PROXY_URL=http://127.0.0.1:7897

# Obsidian 知识库根目录
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian/vault
```

### 3. 运行 CLI

```bash
# 执行今日全量技术雷达采集
pnpm start:daily

# 或使用 CLI 参数
pnpm dev run --date 2026-09-17

# 检查基础设施健康状况
pnpm dev status
```

---

## 🎨 排版规范说明

根据高信噪比极客标准，技术雷达输出格式严格遵循以下契约：
1. **主标题**：`# ⚡ YYYY-MM-DD (星期X) 全栈技术前沿快讯 (高信噪比精选)`
2. **大类别**：汉字大写编号（`## 一、GitHub 今日爆款开源热榜`、`## 二、顶尖大模型与前沿学术精选`）
3. **子条目**：层级编号 `### 1.1 项目名 ([repo](url))`
4. **关键指标**：加粗独立下行 `**今日新增 Star**: +3,231 | **主要语言**: Go`
5. **核心看点**：三层展开（痛点背景 ➡️ 核心解决机制 ➡️ 特性与门槛）
6. **工程启迪**：务实接地，统一使用 **`💡 工程借鉴`**。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 协议完全开源。
欢迎提 Issue 与 PR 共同完善！
