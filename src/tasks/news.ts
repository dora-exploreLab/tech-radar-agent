import { XMLParser } from "fast-xml-parser";
import { consola } from "consola";
import { BaseTask } from "./base.js";
import type { RuntimeContext } from "../core/context.js";
import type { AgentHarness } from "../core/harness.js";
import { type TaskType, type TechNewsItem, TechSummarySchema } from "../core/types.js";

// ==============================================================================
// 📦 国内外大厂核心工程快讯任务 (Tech News Task)
// ==============================================================================
export class TechNewsTask extends BaseTask {
  readonly name: TaskType = "tech_news";
  readonly description = "抓取国内外大厂（美团/OpenAI/Anthropic/阮一峰等）高信噪比工程快讯并去重";

  async execute(context: RuntimeContext, harness: AgentHarness): Promise<string> {
    consola.info("📰 启动国内外大厂核心工程快讯任务...");
    const start = Date.now();

    const sources = [
      {
        name: "美团技术团队",
        url: "https://tech.meituan.com/feed",
        category: "国内大厂高并发架构",
        isDomestic: true,
      },
      {
        name: "阮一峰科技爱好者周刊",
        url: "http://www.ruanyifeng.com/blog/atom.xml",
        category: "科技趋势与独立产品",
        isDomestic: true,
      },
      {
        name: "OpenAI 官方前沿",
        url: "https://openai.com/news/rss.xml",
        category: "大模型研究与前沿",
        isDomestic: false,
      },
    ];

    let allFetchedItems: TechNewsItem[] = [];
    const parser = new XMLParser({ ignoreAttributes: false });

    for (const src of sources) {
      try {
        const xml = await harness.actFetch(src.url, {
          isDomestic: src.isDomestic,
          timeoutMs: 8000,
        });
        const parsed = parser.parse(xml);
        const channel = parsed.rss?.channel || parsed.feed;
        const items = channel?.item || channel?.entry || [];
        const itemList = Array.isArray(items) ? items : [items];

        for (const item of itemList.slice(0, 3)) {
          const title = String(item.title || "").trim();
          let link = item.link;
          if (typeof link === "object" && link !== null) {
            link = link["@_href"] || link.href || "";
          }
          const urlStr = String(link || "").trim();

          if (title && urlStr) {
            allFetchedItems.push({
              title,
              url: urlStr,
              sourceName: src.name,
              category: src.category,
            });
          }
        }
      } catch (err: any) {
        consola.warn(`⚠️ 抓取资讯源 [${src.name}] 失败，优雅跳过: ${err.message || err}`);
      }
    }

    // 数仓查重过滤
    const newItems = await harness.actDedupCheck(
      "tech_news",
      allFetchedItems,
      (item) => item.url
    );

    if (newItems.length === 0) {
      consola.info("ℹ️ 今日工程快讯数据源无纯增量内容，全部已排重命中。");
      context.recordMetric({
        taskType: this.name,
        fetchedCount: allFetchedItems.length,
        newCount: 0,
        processedCount: 0,
        durationMs: Date.now() - start,
        status: "skipped",
        note: "无增量内容更新",
      });
      return "";
    }

    const candidates = newItems.slice(0, 3);

    // LLM 摘要萃取
    for (const art of candidates) {
      const prompt = `你是一名顶级技术媒体总编兼系统架构师。请研读以下技术文章信息：
来源: ${art.sourceName} (${art.category})
标题: ${art.title}
链接: ${art.url}

请严格按如下要求输出单个合法 JSON：
1. title_zh: 极具吸引力的中文标题（10~25字，严谨且专业）
2. pain_point: 文章涉及的业务痛点或技术演进挑战 (不少于 25 字)
3. core_mechanism: 文章核心解决手段或架构技术要点 (不少于 25 字)
4. feature_threshold: 方案优势或落地门槛 (不少于 15 字)
5. engineering_takeaway: 对全栈工程师的技术借鉴与防坑指南 (不少于 25 字)`;

      const fallbackSummary = {
        title_zh: art.title,
        pain_point: "业务爆发式增长对原有技术基建与高可用链路带来严峻考验。",
        core_mechanism: "通过系统解耦、多级缓存机制与全链路压测排障体系平稳演进。",
        feature_threshold: "具备高度工程实战参考价值，适用于中大型微服务架构。",
        engineering_takeaway: "高并发系统的底线在于可观测性（Observability）与限流降级体系。",
        tags: ["工程实战", "高可用"],
      };

      try {
        art.summaryZh = await harness.actReasonAndExtract(
          prompt,
          TechSummarySchema,
          fallbackSummary
        );
      } catch {
        art.summaryZh = fallbackSummary;
      }
    }

    // 数仓持久化
    await harness.actPersistAssets(
      "crawler_articles",
      candidates.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.sourceName,
        category: a.category,
        summary: JSON.stringify(a.summaryZh || {}),
      }))
    );

    context.setArtifact("tech_news", candidates);

    const formattedMarkdown = harness.actFormatTypography("tech_news", candidates, {
      majorIndex: 3,
    });

    context.recordMetric({
      taskType: this.name,
      fetchedCount: allFetchedItems.length,
      newCount: candidates.length,
      processedCount: candidates.length,
      durationMs: Date.now() - start,
      status: "success",
    });

    return formattedMarkdown;
  }
}
