<div align="center">

```
   _______        _     ____           _             
  |__   __|      | |   |  _ \         | |            
     | | ___  ___| |__ | |_) | __ _  __| | __ _ _ __  
     | |/ _ \/ __| '_ \|  _ < / _` |/ _` |/ _` | '__| 
     | |  __/ (__| | | | |_) | (_| | (_| | (_| | |    
     |_|\___|\___|_| |_|____/ \__,_|\__,_|\__,_|_|    
```

# 📡 TechRadar-Agent

> ⚡ **Autonomous Tech Radar & Knowledge Distillation Agent Harness**  
> An open-source, highly-extensible agentic harness built with TypeScript that tracks trending GitHub repositories, ArXiv papers, engineering news, and computer science books, structuring high-signal intelligence directly into your Markdown knowledge vault.

**English** | [简体中文](README_CN.md)

[![GitHub Repo](https://img.shields.io/badge/GitHub-dora--exploreLab%2Ftech--radar--agent-blue?logo=github)](https://github.com/dora-exploreLab/tech-radar-agent)
[![CI](https://github.com/dora-exploreLab/tech-radar-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/dora-exploreLab/tech-radar-agent/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/dora-exploreLab/tech-radar-agent?color=brightgreen)](https://github.com/dora-exploreLab/tech-radar-agent/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg?logo=nodedotjs)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## 💡 Why TechRadar-Agent?

| Dimension | Traditional Script-based Scrapers | ⚡ TechRadar-Agent Harness |
| :--- | :--- | :--- |
| **Architecture** | Spaghetti procedural code, tightly coupled fetch/parse/save | **Modern Agent Harness**, state machine driven with unified `act()` dispatcher |
| **Cognition & Extraction** | Brittle regex or unstructured LLM output | **Zod Schema Contracts**, strictly-typed extraction + Critic reflection & auto-retry |
| **Resilience & Fault Tolerance** | Crashes on network hiccups or API rate limits | **Exponential backoff retry + Circuit breakers + Fallback**, ensuring 0-failure runs |
| **Network Split-Tunneling** | Hardcoded proxy ports (triggers WAF or blocked) | **Smart Routing**: direct connection for domestic whitelists, proxy tunnel for overseas |
| **Deduplication Engine** | Ephemeral txt/json files without cooldown windows | **Pluggable `IDedupStore`**: PostgreSQL 16 warehouse or SQLite local zero-config DB |
| **Knowledge Vault Ingestion** | Inconsistent Markdown formatting, manual copy-pasting | **Geek Typography Engine**: Hierarchical numbering, 3-layer highlights, automatic Obsidian sync |

---

## 🏛️ Agent Harness Cognitive Topology

```mermaid
flowchart TD
    subgraph AgentHarness["TypeScript AgentHarness (Execution Core)"]
        direction TB
        subgraph PerceivePhase["1. Perceive Phase"]
            P1["Multi-source Intelligence (GitHub Trending / ArXiv / Blogs / Books)"]
        end
        subgraph ThinkPhase["2. Think Phase"]
            T1["LLM Cognition & Inference (Strict Zod Schema Output)"]
        end
        subgraph ActPhase["3. Act Dispatcher"]
            A0["harness.act(actionName, payload, executor)"]
            A1["actFetch: Split-tunnel network routing (Direct/Proxy)"]
            A2["actDedupCheck: Warehouse deduplication (14-day cooldown)"]
            A3["actReasonAndExtract: 3-layer engineering distillation"]
            A4["actFormatTypography: Geek typography rendering"]
            A5["actPersistAssets: Atomic warehouse commitment"]
            A6["actWriteObsidian: Markdown vault delivery & Todo check"]
        end
        subgraph ReflectPhase["4. Reflect & Heal Phase"]
            R1["reflect(): Critic check on length, depth, and schema"]
            R2["fallback(): Multi-tier graceful degradation on error"]
        end
    end
    
    P1 --> T1
    T1 --> A0
    A0 --> A1 & A2 & A3 & A4 & A5 & A6
    A3 --> R1
    R1 -.->|Critic rejection| A3
    A0 -.->|Exception caught| R2
```

---

## 🚀 Quick Start

### 1. Prerequisites & Installation
Recommended package manager: [pnpm](https://pnpm.io/):
```bash
git clone https://github.com/dora-exploreLab/tech-radar-agent.git
cd tech-radar-agent
pnpm install
pnpm build
```

### 2. Environment Configuration (`.env`)
Create your `.env` file from the provided template:
```bash
cp .env.example .env
```
Key configuration parameters:
```env
# 🤖 LLM Provider (Compatible with OpenAI / DeepSeek / Ollama)
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your_deepseek_api_key_here
LLM_MODEL=deepseek-chat

# 🗄️ Storage Engine ("postgres", "sqlite", or "memory")
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/crawler_db
SQLITE_PATH=./data/radar.db

# 🔌 Network Proxy Routing ("auto" split-tunnel, "always" proxy, "never" direct)
PROXY_MODE=auto
PROXY_URL=http://127.0.0.1:7897

# 📚 Knowledge Vault Destination
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian/vault
```

---

## 💻 CLI CheatSheet

| Command | Description |
| :--- | :--- |
| `pnpm start:daily` | Run full daily tech radar collection and ingest into vault |
| `pnpm dev status` | Health-check infrastructure (DB, Network, LLM, Vault) |
| `pnpm dev run -d 2026-09-16` | Backfill tech radar for a specific historical date |
| `pnpm dev run --driver sqlite` | Run with zero-config standalone SQLite driver (no Docker needed) |
| `pnpm dev run --no-proxy` | Force direct connection bypassing proxy tunnels |
| `pnpm typecheck` | Run static TypeScript compiler check (`tsc --noEmit`) |
| `pnpm test` | Run 12/12 unit and integration test assertions |

---

## 🎨 Sample Geek Typography Output

Daily digests generated by TechRadar-Agent strictly follow geek aesthetics:

```markdown
# ⚡ 2026-09-17 (Thursday) Full-Stack Tech Radar Digest

## 一、 GitHub Trending Repositories

### 1.1 FastChat (lm-sys/FastChat)
- **New Stars Today**: +2,150 | **Language**: Python | **Topic**: LLM Serving & Evaluation
- **Key Takeaways**: 
  - Resolves multi-model serving complexity by designing a high-concurrency distributed Controller architecture;
  - Deep support for batched inference and 4-bit/8-bit quantization, significantly slashing VRAM usage;
  - **💡 Engineering Insights**: Uses the adapter pattern at the gateway layer to eliminate protocol discrepancies across heterogeneous model weights.
```

---

## 🧩 Extensibility: Add a Source in 3 Steps

1. **Implement Task Class**: Create `src/tasks/my_task.ts` extending `BaseTask`:
   ```ts
   import { BaseTask } from "./base.js";
   import { RuntimeContext } from "../core/context.js";

   export class MyTask extends BaseTask {
     readonly taskType = "my_source" as any;
     readonly description = "My Custom Intelligence Source";

     async execute(context: RuntimeContext): Promise<void> {
       const raw = await this.harness.act("fetch", { ... }, async () => { ... });
       // Dedup, analyze, format, and persist...
     }
   }
   ```
2. **Register in Pipeline**: Add your new task instance to `TaskPipeline` in `src/core/agent.ts`.
3. **Configure Environment**: Add the task identifier to `TASKS_ENABLED` in `.env`.

---

## 📈 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=dora-exploreLab/tech-radar-agent&type=Date)](https://star-history.com/#dora-exploreLab/tech-radar-agent&Date)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).