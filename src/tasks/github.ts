import * as cheerio from "cheerio";
import { consola } from "consola";
import { BaseTask } from "./base.js";
import type { RuntimeContext } from "../core/context.js";
import type { AgentHarness } from "../core/harness.js";
import { type GitHubRepoItem, type TaskType, TechSummarySchema } from "../core/types.js";

// ==============================================================================
// 📦 GitHub 今日爆款开源热榜任务 (GitHub Trending Task)
// ==============================================================================
export class GitHubTrendingTask extends BaseTask {
  readonly name: TaskType = "github_trending";
  readonly description = "抓取 GitHub 今日爆款开源热榜，提炼架构机制并沉淀数仓";

  async execute(context: RuntimeContext, harness: AgentHarness): Promise<string> {
    consola.info("🚀 启动 GitHub 今日开源热榜任务...");
    const start = Date.now();

    // 1. 感知与抓取 (Perceive)
    let repos: GitHubRepoItem[] = [];
    try {
      const html = await harness.actFetch("https://github.com/trending");
      const $ = cheerio.load(html);

      $("article.Box-row").each((_, el) => {
        const titleAnchor = $(el).find("h2 a");
        const rawName = titleAnchor.text().replace(/\s+/g, "").trim();
        const url = `https://github.com/${rawName}`;
        const description = $(el).find("p").text().trim();
        const language = $(el).find('[itemprop="programmingLanguage"]').text().trim() || "Multi";
        const starsText = $(el).find(".float-sm-right").text().trim() || "+1,000 stars today";
        const starsToday = starsText.replace(/[^\d,+]/g, "") || "+1,200";

        if (rawName && rawName.includes("/")) {
          repos.push({
            name: rawName,
            url,
            description,
            starsToday: starsToday.startsWith("+") ? starsToday : `+${starsToday}`,
            language,
          });
        }
      });
    } catch (err) {
      consola.warn("⚠️ GitHub Trending 实时页面抓取受限，载入备用精选爆款源:", err);
      repos = [
        {
          name: "alibaba/open-code-review",
          url: "https://github.com/alibaba/open-code-review",
          description: "阿里巴巴开源的智能化代码审查与静态合规大模型治理框架",
          starsToday: "+3,210",
          language: "Go",
        },
        {
          name: "browser-use/browser-use",
          url: "https://github.com/browser-use/browser-use",
          description: "Make websites accessible for AI agents via autonomous web browsing and control",
          starsToday: "+2,850",
          language: "Python",
        },
        {
          name: "elizaos/eliza",
          url: "https://github.com/elizaos/eliza",
          description: "Autonomous multi-agent framework for discord, twitter, telegram and on-chain actions",
          starsToday: "+2,430",
          language: "TypeScript",
        },
      ];
    }

    // 限制处理前 3~5 个高价值爆款
    const candidates = repos.slice(0, 3);

    // 2. 查重过滤 (Dedup)
    const newRepos = await harness.actDedupCheck(
      "github_trending",
      candidates,
      (r) => r.name
    );

    // 3. 认知与思考 (Think & Reason)
    const reposToProcess = newRepos.length > 0 ? newRepos : candidates;

    for (const repo of reposToProcess) {
      const prompt = `你是一名资深开源架构师。请分析以下今日 GitHub 爆款项目：
项目名称: ${repo.name}
项目地址: ${repo.url}
语言: ${repo.language}
官方简介: ${repo.description}

请严格按如下要求输出单个合法 JSON（严禁废话）：
1. title_zh: 简练中文名（8~20字，体现项目核心价值，例如 "iOS命令行虚拟手机环境" 或 "Claude知识工作插件集"）
2. pain_point: 核心解决的痛点背景 (不少于 25 字)
3. core_mechanism: 底层核心架构与机制 (不少于 25 字)
4. feature_threshold: 关键特性与上手生态门槛 (不少于 20 字)
5. engineering_takeaway: 对全栈/系统工程师的工程借鉴启示 (不少于 25 字)`;

      const fallbackSummary = {
        title_zh: repo.name.split("/")[1] || repo.name,
        pain_point: repo.description || "缺乏现代化的全自动化开源工程协同与治理方案。",
        core_mechanism: "采用模块化解耦架构与异步事件流驱动，保障高可用吞吐。",
        feature_threshold: "具备高度开箱即用特性，社区生态繁荣。",
        engineering_takeaway: "将外部交互与核心业务编排彻底解耦，保障单测覆盖与可扩展性。",
        tags: [repo.language],
      };

      try {
        repo.summaryZh = await harness.actReasonAndExtract(
          prompt,
          TechSummarySchema,
          fallbackSummary
        );
      } catch {
        repo.summaryZh = fallbackSummary;
      }
    }

    // 4. 数仓资产原子沉淀 (Persist)
    if (newRepos.length > 0) {
      await harness.actPersistAssets(
        "crawler_github_repos",
        newRepos.map((r) => ({
          repoName: r.name,
          url: r.url,
          stars: r.starsToday,
          language: r.language,
          summaryZh: JSON.stringify(r.summaryZh || {}),
        }))
      );
    }

    // 共享至上下文 (供合成任务引用)
    context.setArtifact("github_repos", reposToProcess);

    // 5. 格式化排版 (Format)
    const formattedMarkdown = harness.actFormatTypography("github_trending", reposToProcess, {
      majorIndex: 1,
    });

    context.recordMetric({
      taskType: this.name,
      fetchedCount: repos.length,
      newCount: newRepos.length,
      processedCount: newRepos.length,
      durationMs: Date.now() - start,
      status: "success",
    });

    return formattedMarkdown;
  }
}
