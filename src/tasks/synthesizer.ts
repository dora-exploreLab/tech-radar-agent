import path from "node:path";
import { consola } from "consola";
import { BaseTask } from "./base.js";
import type { RuntimeContext } from "../core/context.js";
import type { AgentHarness } from "../core/harness.js";
import type { GitHubRepoItem, ArxivPaperItem, TechNewsItem, TaskType } from "../core/types.js";
import { config } from "../config/index.js";

// ==============================================================================
// 📦 全媒体深度技术专栏长文合成任务 (Column Synthesizer Task)
// ==============================================================================
export class ColumnSynthesizerTask extends BaseTask {
  readonly name: TaskType = "column_synthesizer";
  readonly description = "基于今日动态真实技术资产，合成深度专栏长文并执行单日幂等控制";

  async execute(context: RuntimeContext, harness: AgentHarness): Promise<string> {
    consola.info("📝 启动全媒体深度技术专栏长文合成任务...");
    const start = Date.now();

    // 1. 检查单日幂等锁 (Idempotency Check)
    const canRun = await harness.actAcquireIdempotencyLock(this.name, context.runDate);
    if (!canRun) {
      consola.info(`[Idempotent] 今日专栏长文 (${context.runDate}) 已合成过，幂等跳过。`);
      context.recordMetric({
        taskType: this.name,
        fetchedCount: 0,
        newCount: 0,
        processedCount: 0,
        durationMs: Date.now() - start,
        status: "skipped",
        note: "单日幂等跳过",
      });
      return "";
    }

    // 2. 从上下文中聚合今日动态素材
    const repos = context.getArtifact<GitHubRepoItem[]>("github_repos") || [];
    const papers = context.getArtifact<ArxivPaperItem[]>("arxiv_papers") || [];
    const news = context.getArtifact<TechNewsItem[]>("tech_news") || [];

    const topRepo = repos[0];
    const topPaper = papers[0];

    const repoTitle = topRepo?.summaryZh?.title_zh || topRepo?.name || "现代开源工程";
    const paperTitle = topPaper?.deepBreakthrough?.title_zh || topPaper?.title || "大模型推理进化";

    const columnTitle = `${context.runDate} 深度观察：从 ${repoTitle} 看现代全栈工程演进与 ${paperTitle}`;
    const columnFileName = `${context.runDate}-${repoTitle.replace(/[\\/:*?"<>|]/g, "_")}.md`;
    const targetPath = path.join(config.vault.columnDir, columnFileName);

    // 3. 动态合成工业级技术专栏长文
    const content = `---
title: "${columnTitle}"
date: ${context.runDate}
author: "dorabighead & TechRadarAgent"
category: "深度技术专栏"
status: "已完成"
tags: ["全栈架构", "技术雷达", "深度分析", "开源生态"]
---

# 🚀 ${columnTitle}

> 🎯 **引言**：在软件工程快速重塑的当下，从单体脚本到自主智能体（Autonomous Agents），从粗糙的 API 拼装到具备感知、思考、行动与自纠错能力的系统架构，现代全栈系统正在经历深刻变革。本文基于 **${context.runDate}** 实时沉淀的技术雷达资产，深度剖析前沿开源创新与底层学术突破。

---

## 🏛️ 一、开源技术前沿剖析：以 ${topRepo?.name || "开源项目"} 为例

${topRepo ? `
**开源仓库**：[${topRepo.name}](${topRepo.url}) | **今日热度**：${topRepo.starsToday} | **核心语言**：${topRepo.language}

### 1.1 痛点背景
${topRepo.summaryZh?.pain_point || topRepo.description}

### 1.2 核心解决机制与底层设计
${topRepo.summaryZh?.core_mechanism || "采用严格分层的系统拓扑，解耦外部环境与业务中枢。"}

### 1.3 💡 工程借鉴与落地启示
${topRepo.summaryZh?.engineering_takeaway || "在大型生产级工程中，严禁硬编码依赖，推行接口化驱动与依赖注入。"}
` : "今日暂无新增爆款开源条目。"}

---

## 🔬 二、学术突破与理论根基：以 ${topPaper?.title || "前沿论文"} 为例

${topPaper ? `
**论文编号**：${topPaper.paperId} | **论文标题**：[${topPaper.title}](${topPaper.url})

### 2.1 理论痛点与研究背景
${topPaper.deepBreakthrough?.pain_point || topPaper.summary}

### 2.2 核心创新机制
${topPaper.deepBreakthrough?.core_mechanism || "提出创新数学模型优化推断计算效率。"}

### 2.3 💡 对工业级架构的启发
${topPaper.deepBreakthrough?.engineering_takeaway || "理论模型在测试期算力与验证回路上的设计可反哺工程链路建设。"}
` : "今日学术论文处于冷却期。"}

---

## 💡 三、总结与展望
无论技术浪潮如何迭代，**高内聚、低耦合、配置彻底解耦、健壮的重试与容错降级（Harness Fallback）** 始终是支撑企业级系统历久弥新的不二法则。

---
*本文由 TechRadar-Harness 智能体自动编排并落盘至知识库技术专栏。*
`;

    // 4. 落盘 Obsidian
    await harness.actWriteObsidian(targetPath, content, false);

    // 5. 记录成功审计与更新单日幂等锁
    await harness.actPersistAssets("crawler_daily_runs", []);
    // 直接记录 daily run 到数仓
    const dedupStore = (harness as any).dedupStore;
    if (dedupStore) {
      await dedupStore.recordDailyRun(this.name, context.runDate, "success", {
        columnTitle,
        targetPath,
      });
    }

    consola.success(`🎉 今日技术专栏长文合成成功: ${columnFileName}`);

    context.recordMetric({
      taskType: this.name,
      fetchedCount: 1,
      newCount: 1,
      processedCount: 1,
      durationMs: Date.now() - start,
      status: "success",
    });

    return `\n> 📰 **今日专栏长文同步产出**：[[${columnFileName}|${columnTitle}]]\n\n`;
  }
}
