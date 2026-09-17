import path from "node:path";
import { consola } from "consola";
import { config } from "../config/index.js";
import { createDedupStore } from "../adapters/db.js";
import { AgentHarness } from "./harness.js";
import { RuntimeContext } from "./context.js";
import { TaskPipeline } from "./pipeline.js";
import { GitHubTrendingTask } from "../tasks/github.js";
import { ArxivPapersTask } from "../tasks/papers.js";
import { TechNewsTask } from "../tasks/news.js";
import { CSBooksTask } from "../tasks/books.js";
import { ColumnSynthesizerTask } from "../tasks/synthesizer.js";
import type { IDedupStore } from "./types.js";

// ==============================================================================
// 🤖 全栈技术雷达自主智能体主门面 (TechRadarAgent Facade)
// ==============================================================================
export class TechRadarAgent {
  private dedupStore: IDedupStore;
  private harness: AgentHarness;
  private pipeline: TaskPipeline;

  constructor() {
    this.dedupStore = createDedupStore(config);
    this.harness = new AgentHarness(config, this.dedupStore);
    this.pipeline = new TaskPipeline();
    this.registerEnabledTasks();
  }

  private registerEnabledTasks(): void {
    const enabled = new Set(config.tasks.enabled);

    if (enabled.has("github")) this.pipeline.registerTask(new GitHubTrendingTask());
    if (enabled.has("papers")) this.pipeline.registerTask(new ArxivPapersTask());
    if (enabled.has("news")) this.pipeline.registerTask(new TechNewsTask());
    if (enabled.has("books")) this.pipeline.registerTask(new CSBooksTask());
    if (enabled.has("synthesizer")) this.pipeline.registerTask(new ColumnSynthesizerTask());
  }

  async init(): Promise<void> {
    try {
      await this.dedupStore.connect();
      consola.success(`🗄️ [Storage] 数仓存储驱动连接就绪 (${config.storage.driver})`);
    } catch (err) {
      consola.warn("⚠️ 数仓连接失败，自动降级为无锁离线模式:", err);
    }
  }

  async close(): Promise<void> {
    await this.dedupStore.disconnect();
  }

  /**
   * 执行每日全域技术雷达采集与沉淀流水线
   */
  async runDailyDigest(dateOverride?: string): Promise<{
    date: string;
    totalTasks: number;
    completedTasks: number;
    totalNewAssets: number;
    durationMs: number;
    digestFilePath: string;
  }> {
    const context = new RuntimeContext(dateOverride);
    consola.info(`🌐 启动全栈技术雷达智能体 | 目标日期: ${context.runDate} (${context.weekday})`);

    // 1. 运行任务流水线
    const results = await this.pipeline.runAll(context, this.harness);

    // 2. 汇聚各模块 Markdown 产物
    const formatter = this.harness.getFormatter();
    const digestTitle = formatter.formatDailyTitle(
      context.runDate,
      context.weekday,
      "全栈技术前沿快讯"
    );

    let fullMarkdown = `---
title: "${context.runDate} (${context.weekday}) 全栈技术前沿快讯"
date: ${context.runDate}
author: "TechRadarAgent & dorabighead"
category: "前沿快讯"
status: "已归档"
tags: ["技术快讯", "GitHub热榜", "学术文献", "经典好书", "高信噪比", "Harness"]
---

${digestTitle}

> 🎯 **智能体运行导言**：本期快讯由 **TechRadar-Harness** 智能体自主调度感知、多引擎指纹排重与深度认知萃取完成。全域指标与前沿机制深度提炼，严格遵循极客排版与工程启迪准则。

---

`;

    // 拼装各个章节
    const githubMd = results.get("github_trending") || "";
    const papersMd = results.get("arxiv_papers") || "";
    const newsMd = results.get("tech_news") || "";
    const booksMd = results.get("cs_books") || "";
    const synthMd = results.get("column_synthesizer") || "";

    if (githubMd) fullMarkdown += `${githubMd}\n---\n\n`;
    if (papersMd) fullMarkdown += `${papersMd}\n---\n\n`;
    if (newsMd) fullMarkdown += `${newsMd}\n---\n\n`;
    if (booksMd) fullMarkdown += `${booksMd}\n---\n\n`;
    if (synthMd) fullMarkdown += `${synthMd}\n---\n\n`;

    fullMarkdown += `*今日知识沉淀结束于 ${new Date().toLocaleTimeString()}，资产已全量归档至本地知识库与数仓。*\n`;

    // 3. 落盘 Obsidian 知识库并同步今日待办
    const digestFileName = `${context.runDate}-全栈技术前沿快讯.md`;
    const digestPath = path.join(config.vault.techNewsDir, digestFileName);

    await this.harness.actWriteObsidian(digestPath, fullMarkdown, true);
    consola.success(`🎉 每日技术快讯资产安全落盘: ${digestPath}`);

    // 4. 记录 Agent 单日总览审计
    const summary = context.getSummary();
    await this.dedupStore.recordDailyRun("daily_digest", context.runDate, "success", summary);

    return {
      ...summary,
      digestFilePath: digestPath,
    };
  }
}
