import axios from "axios";
import { consola } from "consola";
import { z } from "zod";
import type { AppConfig } from "../config/index.js";
import { TypographyFormatter } from "../config/typography.js";
import { NetworkAdapter } from "../adapters/network.js";
import { VaultAdapter } from "../adapters/vault.js";
import type {
  ActionResult,
  FetchOptions,
  IDedupStore,
  TaskType,
  TechSummary,
} from "./types.js";
import { TechSummarySchema } from "./types.js";

// ==============================================================================
// 🛡️ Agent Harness 运行时执行脚手架 (Agent Runtime Harness)
// ==============================================================================
export class AgentHarness {
  private networkAdapter: NetworkAdapter;
  private vaultAdapter: VaultAdapter;
  private formatter: TypographyFormatter;

  constructor(
    private config: AppConfig,
    private dedupStore: IDedupStore
  ) {
    this.networkAdapter = new NetworkAdapter(config.network);
    this.vaultAdapter = new VaultAdapter(config.vault);
    this.formatter = new TypographyFormatter(config.typography);
  }

  getFormatter(): TypographyFormatter {
    return this.formatter;
  }

  getVaultAdapter(): VaultAdapter {
    return this.vaultAdapter;
  }

  // ==========================================
  // 1. 统一动作派发中枢 (Act Dispatcher)
  // ==========================================
  async act<T>(
    actionName: string,
    executor: () => Promise<T>,
    options?: { retries?: number; timeoutMs?: number }
  ): Promise<ActionResult<T>> {
    const start = Date.now();
    const maxRetries = options?.retries ?? 2;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await executor();
        return {
          success: true,
          actionName,
          data: result,
          durationMs: Date.now() - start,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          consola.warn(`⚠️ [Harness Act] ${actionName} 失败，将在 ${delay}ms 后重试 (${attempt + 1}/${maxRetries}): ${err.message || err}`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    return {
      success: false,
      actionName,
      error: lastError instanceof Error ? lastError : new Error(String(lastError)),
      durationMs: Date.now() - start,
    };
  }

  // ==========================================
  // 2. 八大强类型 act_* 动作家族
  // ==========================================

  /**
   * Action 1: actFetch - 智能网络分流抓取
   */
  async actFetch(url: string, options?: FetchOptions): Promise<string> {
    const res = await this.act(`fetch:${url.slice(0, 40)}`, () =>
      this.networkAdapter.fetch(url, options)
    );
    if (!res.success || res.data === undefined) {
      throw res.error || new Error(`actFetch 失败: ${url}`);
    }
    return res.data;
  }

  /**
   * Action 2: actDedupCheck - 多引擎数仓指纹查重
   */
  async actDedupCheck<T>(
    sourceType: string,
    items: T[],
    keySelector: (item: T) => string
  ): Promise<T[]> {
    const res = await this.act(`dedup_check:${sourceType}`, () =>
      this.dedupStore.filterNewItems(sourceType, items, keySelector)
    );
    return res.data || items;
  }

  /**
   * Action 3: actReasonAndExtract - LLM 思考、萃取与自省自愈循环
   */
  async actReasonAndExtract<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    fallbackData?: T
  ): Promise<T> {
    const res = await this.act("reason_and_extract", async () => {
      // 若无 API Key 则直接降级
      if (!this.config.llm.apiKey) {
        if (fallbackData) return fallbackData;
        throw new Error("缺少 LLM_API_KEY 配置且未提供降级模板");
      }

      return await this.executeReasonLoopWithCritic(prompt, schema);
    });

    if (res.success && res.data) {
      return res.data;
    }

    if (fallbackData) {
      consola.warn("⚠️ LLM 调用发生阻断，平滑切换至本地降级模板");
      return fallbackData;
    }
    throw res.error || new Error("actReasonAndExtract 失败");
  }

  /**
   * Action 4: actFormatTypography - 模块化排版渲染
   */
  actFormatTypography(
    taskType: TaskType,
    payload: any,
    options?: { majorIndex?: number }
  ): string {
    const majorIdx = options?.majorIndex ?? 1;

    if (taskType === "github_trending") {
      const repos = payload as Array<{
        name: string;
        url: string;
        description: string;
        starsToday: string;
        language: string;
        summaryZh?: TechSummary;
      }>;

      let md = `${this.formatter.getMajorHeading(majorIdx, "GitHub 今日爆款开源热榜")}\n\n`;

      repos.forEach((repo, idx) => {
        const subIdx = idx + 1;
        const titleZh = repo.summaryZh?.title_zh || repo.name;
        const subHeading = this.formatter.getSubItemHeading(
          majorIdx,
          subIdx,
          titleZh,
          repo.name,
          repo.url
        );

        const metrics = this.formatter.formatMetrics([
          { label: "今日新增 Star", value: repo.starsToday },
          { label: "主要语言", value: repo.language || "Unknown" },
          { label: "开源仓库", value: repo.name, url: repo.url },
        ]);

        const pain = repo.summaryZh?.pain_point || repo.description;
        const mechanism = repo.summaryZh?.core_mechanism || "基于现代化工程架构解耦设计与开源协同。";
        const threshold = repo.summaryZh?.feature_threshold || "开箱即用，具备友好易懂的上手门槛。";
        const takeaway = repo.summaryZh?.engineering_takeaway || "模块化设计与分层清晰的职责隔离模式。";

        md += `${subHeading}\n`;
        md += `${metrics}\n\n`;
        md += `- ${this.formatter.getHighlightsHeader()}\n`;
        md += `  1. **背景痛点**: ${this.formatter.sanitize(pain)}\n`;
        md += `  2. **核心机制**: ${this.formatter.sanitize(mechanism)}\n`;
        md += `  3. **生态门槛**: ${this.formatter.sanitize(threshold)}\n`;
        md += `- ${this.formatter.getInsightHeader()} ${this.formatter.sanitize(takeaway)}\n\n`;
      });

      return md;
    }

    if (taskType === "arxiv_papers") {
      const papers = payload as Array<{
        title: string;
        titleZh: string;
        url: string;
        authors: string[];
        summary: string;
        deepBreakthrough?: TechSummary;
      }>;

      let md = `${this.formatter.getMajorHeading(majorIdx, "顶尖大模型与前沿学术论文精选")}\n\n`;

      papers.forEach((paper, idx) => {
        const subIdx = idx + 1;
        const titleZh = paper.deepBreakthrough?.title_zh || paper.titleZh || paper.title;
        const subHeading = this.formatter.getSubItemHeading(
          majorIdx,
          subIdx,
          titleZh,
          "ArXiv Paper",
          paper.url
        );

        const authorStr = paper.authors.slice(0, 3).join(", ") + (paper.authors.length > 3 ? " 等" : "");
        const metrics = this.formatter.formatMetrics([
          { label: "主要作者", value: authorStr },
          { label: "论文链接", value: paper.url, url: paper.url },
        ]);

        const pain = paper.deepBreakthrough?.pain_point || paper.summary.slice(0, 100);
        const mechanism = paper.deepBreakthrough?.core_mechanism || "提出创新数学模型与网络架构。";
        const threshold = paper.deepBreakthrough?.feature_threshold || "实验基于顶尖基准测试复现。";
        const takeaway = paper.deepBreakthrough?.engineering_takeaway || "为落地系统设计提供了坚实理论支撑。";

        md += `${subHeading}\n`;
        md += `${metrics}\n\n`;
        md += `- ${this.formatter.getHighlightsHeader()}\n`;
        md += `  1. **问题根因**: ${this.formatter.sanitize(pain)}\n`;
        md += `  2. **核心突破**: ${this.formatter.sanitize(mechanism)}\n`;
        md += `  3. **指标评测**: ${this.formatter.sanitize(threshold)}\n`;
        md += `- ${this.formatter.getInsightHeader()} ${this.formatter.sanitize(takeaway)}\n\n`;
      });

      return md;
    }

    if (taskType === "tech_news") {
      const articles = payload as Array<{
        title: string;
        url: string;
        sourceName: string;
        category: string;
        summaryZh?: TechSummary;
      }>;

      let md = `${this.formatter.getMajorHeading(majorIdx, "国内外大厂核心工程快讯")}\n\n`;

      articles.forEach((art, idx) => {
        const subIdx = idx + 1;
        const titleZh = art.summaryZh?.title_zh || art.title;
        const subHeading = this.formatter.getSubItemHeading(
          majorIdx,
          subIdx,
          titleZh,
          art.sourceName,
          art.url
        );

        const metrics = this.formatter.formatMetrics([
          { label: "资讯来源", value: art.sourceName },
          { label: "领域分类", value: art.category },
          { label: "原文链接", value: "直达阅读", url: art.url },
        ]);

        const pain = art.summaryZh?.pain_point || "业务规模爆发式增长下的系统演进挑战。";
        const mechanism = art.summaryZh?.core_mechanism || "底层链路重构与高并发容量治理。";
        const takeaway = art.summaryZh?.engineering_takeaway || "高可用系统的设计必须守住兜底与观测底线。";

        md += `${subHeading}\n`;
        md += `${metrics}\n\n`;
        md += `- ${this.formatter.getHighlightsHeader()} ${this.formatter.sanitize(pain)} ➡️ ${this.formatter.sanitize(mechanism)}\n`;
        md += `- ${this.formatter.getInsightHeader()} ${this.formatter.sanitize(takeaway)}\n\n`;
      });

      return md;
    }

    return "";
  }

  /**
   * Action 5: actPersistAssets - 历史资产入库
   */
  async actPersistAssets(tableName: string, records: any[]): Promise<number> {
    const res = await this.act(`persist_assets:${tableName}`, async () => {
      if (tableName === "crawler_articles") {
        return await this.dedupStore.saveArticles(records);
      } else if (tableName === "crawler_papers") {
        return await this.dedupStore.savePapers(records);
      } else if (tableName === "crawler_github_repos") {
        return await this.dedupStore.saveRepos(records);
      }
      return 0;
    });
    return res.data || 0;
  }

  /**
   * Action 6: actAcquireIdempotencyLock - 单日幂等锁
   */
  async actAcquireIdempotencyLock(taskName: string, dateStr: string): Promise<boolean> {
    const res = await this.act(`idempotency_check:${taskName}`, () =>
      this.dedupStore.checkIdempotency(taskName, dateStr)
    );
    // 如果已经成功运行过，返回 false 表示无法再次获取执行锁
    return !(res.data ?? false);
  }

  /**
   * Action 7: actWriteObsidian - 知识库落盘与待办打卡
   */
  async actWriteObsidian(filepath: string, markdown: string, syncTodo: boolean = true): Promise<void> {
    const res = await this.act(`write_vault:${filepath}`, async () => {
      await this.vaultAdapter.writeMarkdown(filepath, markdown);
      if (syncTodo) {
        await this.vaultAdapter.syncTodoItem();
      }
    });
    if (!res.success) {
      throw res.error || new Error(`写入 Obsidian 失败: ${filepath}`);
    }
  }

  /**
   * Action 8: actFallback - 熔断降级动作
   */
  async actFallback<T>(
    taskName: string,
    actionName: string,
    fallbackFn: () => Promise<T>
  ): Promise<T> {
    consola.warn(`🛡️ [Harness Fallback] 任务 [${taskName}] 动作 [${actionName}] 触发降级`);
    return await fallbackFn();
  }

  // ==========================================
  // 3. 核心 LLM 推理与 Critic 自纠错循环
  // ==========================================
  private async executeReasonLoopWithCritic<T>(
    prompt: string,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    let currentPrompt = prompt;
    const maxCriticRetries = this.config.llm.maxRetries;

    for (let round = 0; round <= maxCriticRetries; round++) {
      const responseText = await this.callOpenAICompatibleApi(currentPrompt);

      try {
        // 尝试从 Markdown JSON 代码块或纯文本中提取 JSON
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
        const jsonStr = (jsonMatch[1] || responseText).trim();
        const parsed = JSON.parse(jsonStr);

        // Zod 强类型校验
        const validated = schema.parse(parsed);

        // 反思审查 (Reflection Check)
        const reflection = this.reflectOutput(validated);
        if (reflection.pass) {
          return validated;
        }

        // 未通过业务反思，触发 Critic 追问
        consola.warn(`🔍 [Critic] 校验未通过: ${reflection.feedback}，进行第 ${round + 1} 次自愈重试`);
        currentPrompt = `${prompt}\n\n【上一轮生成的缺陷自检反馈】: ${reflection.feedback}。请严格按反馈重新修正输出合规 JSON！`;
      } catch (err: any) {
        consola.warn(`🔍 [Critic] JSON 解析或 Schema 验证失败: ${err.message}，重试中...`);
        currentPrompt = `${prompt}\n\n【格式错误警报】: 上一次输出未能成功解析为严格的 JSON。请务必只输出合法的单个 JSON 对象！`;
      }
    }

    throw new Error(`LLM 经过 ${maxCriticRetries} 轮 Critic 自省依然未能产出合规数据`);
  }

  /**
   * 业务反思评估器
   */
  private reflectOutput(data: any): { pass: boolean; feedback?: string } {
    if (data && typeof data === "object") {
      if (data.title_zh && (data.title_zh.length > 30 || data.title_zh.length < 4)) {
        return {
          pass: false,
          feedback: `中文标题必须在 4 到 30 字之间，当前标题为 "${data.title_zh}" (${data.title_zh.length} 字)，请大幅精简凝练！`,
        };
      }
      if (data.pain_point && data.pain_point.length < 15) {
        return {
          pass: false,
          feedback: "核心痛点展开过短，请补充行业背景或具体系统瓶颈（不少于 20 字）！",
        };
      }
    }
    return { pass: true };
  }

  private async callOpenAICompatibleApi(prompt: string): Promise<string> {
    const url = `${this.config.llm.baseUrl.replace(/\/$/, "")}/chat/completions`;

    const res = await axios.post(
      url,
      {
        model: this.config.llm.model,
        messages: [
          {
            role: "system",
            content:
              "你是一名全栈系统架构师与技术雷达专家。输出必须为纯粹合法的单个 JSON 对象，不包含任何外部 Markdown 闲聊前缀或尾注。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.llm.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return res.data?.choices?.[0]?.message?.content || "";
  }
}
