import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { consola } from "consola";
import type { IDedupStore } from "../core/types.js";
import type { AppConfig } from "../config/index.js";

const { Pool } = pg;

// ==============================================================================
// 1. PostgreSQL 知识数仓存储驱动
// ==============================================================================
export class PostgresDedupStore implements IDedupStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (err) {
      consola.warn("⚠️ PostgreSQL 连接异常，将尝试运行降级模式:", err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async filterNewItems<T>(
    sourceType: string,
    items: T[],
    keySelector: (item: T) => string
  ): Promise<T[]> {
    if (!items || items.length === 0) return [];

    const keys = items.map(keySelector).filter(Boolean);
    if (keys.length === 0) return items;

    let existingKeys = new Set<string>();

    try {
      if (sourceType === "tech_news") {
        const res = await this.pool.query(
          "SELECT url FROM crawler_articles WHERE url = ANY($1::text[])",
          [keys]
        );
        res.rows.forEach((r) => existingKeys.add(r.url));
      } else if (sourceType === "arxiv_papers") {
        // 14 天冷却期去重
        const res = await this.pool.query(
          "SELECT arxiv_id FROM crawler_papers WHERE arxiv_id = ANY($1::text[]) AND first_seen_at >= NOW() - INTERVAL '14 days'",
          [keys]
        );
        res.rows.forEach((r) => existingKeys.add(r.arxiv_id));
      } else if (sourceType === "github_trending") {
        const res = await this.pool.query(
          "SELECT repo_name FROM crawler_github_repos WHERE repo_name = ANY($1::text[]) AND date_recorded = CURRENT_DATE",
          [keys]
        );
        res.rows.forEach((r) => existingKeys.add(r.repo_name));
      }
    } catch (err) {
      consola.warn(`⚠️ PG 查询排重失败 [${sourceType}]，放行所有项:`, err);
      return items;
    }

    return items.filter((item) => !existingKeys.has(keySelector(item)));
  }

  async saveArticles(
    articles: Array<{ title: string; url: string; source: string; category?: string; summary?: string }>
  ): Promise<number> {
    if (!articles || articles.length === 0) return 0;
    let saved = 0;

    for (const art of articles) {
      try {
        const res = await this.pool.query(
          `INSERT INTO crawler_articles (url, url_hash, title, source_name, category, summary_zh, first_seen_at)
           VALUES ($1, md5($1), $2, $3, $4, $5, NOW())
           ON CONFLICT (url) DO NOTHING
           RETURNING id`,
          [art.url, art.title, art.source, art.category || "综合技术", art.summary || ""]
        );
        if (res.rowCount && res.rowCount > 0) saved++;
      } catch (err) {
        // 忽略单条唯一冲突
      }
    }
    return saved;
  }

  async savePapers(
    papers: Array<{ paperId: string; title: string; url: string; authors?: string; category?: string; summaryZh?: string }>
  ): Promise<number> {
    if (!papers || papers.length === 0) return 0;
    let saved = 0;

    for (const p of papers) {
      try {
        let summaryObj: any = {};
        try {
          summaryObj = p.summaryZh ? JSON.parse(p.summaryZh) : {};
        } catch {}

        const res = await this.pool.query(
          `INSERT INTO crawler_papers (arxiv_id, title, title_zh, authors, core_breakthrough, engineering_takeaway, first_seen_at, last_recommended_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), CURRENT_DATE)
           ON CONFLICT (arxiv_id) DO UPDATE SET
             last_recommended_at = CURRENT_DATE
           RETURNING id`,
          [
            p.paperId,
            p.title,
            summaryObj.title_zh || p.title,
            p.authors || "",
            summaryObj.core_mechanism || "",
            summaryObj.engineering_takeaway || "",
          ]
        );
        if (res.rowCount && res.rowCount > 0) saved++;
      } catch (err) {}
    }
    return saved;
  }

  async saveRepos(
    repos: Array<{ repoName: string; url: string; stars?: string; language?: string; summaryZh?: string }>
  ): Promise<number> {
    if (!repos || repos.length === 0) return 0;
    let saved = 0;

    for (const r of repos) {
      try {
        let summaryObj: any = {};
        try {
          summaryObj = r.summaryZh ? JSON.parse(r.summaryZh) : {};
        } catch {}

        const numericStars = parseInt((r.stars || "0").replace(/[^\d]/g, ""), 10) || 0;

        const res = await this.pool.query(
          `INSERT INTO crawler_github_repos (repo_name, repo_url, language, stars_today, title_zh, why_trending, architect_takeaway, date_recorded)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
           ON CONFLICT (repo_name, date_recorded) DO UPDATE SET
             stars_today = EXCLUDED.stars_today,
             title_zh = EXCLUDED.title_zh
           RETURNING id`,
          [
            r.repoName,
            r.url,
            r.language || "Unknown",
            numericStars,
            summaryObj.title_zh || r.repoName,
            summaryObj.pain_point || "",
            summaryObj.engineering_takeaway || "",
          ]
        );
        if (res.rowCount && res.rowCount > 0) saved++;
      } catch (err) {}
    }
    return saved;
  }

  async checkIdempotency(taskName: string, dateStr: string): Promise<boolean> {
    try {
      const res = await this.pool.query(
        "SELECT column_article_file FROM crawler_daily_runs WHERE run_date = $1::date AND column_article_file IS NOT NULL",
        [dateStr]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      return false;
    }
  }

  async recordDailyRun(
    taskName: string,
    dateStr: string,
    status: string,
    summaryInfo?: any
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO crawler_daily_runs (run_date, status, column_article_file, tech_news_file, updated_at)
         VALUES ($1::date, $2, $3, $4, NOW())
         ON CONFLICT (run_date) DO UPDATE SET
           status = EXCLUDED.status,
           column_article_file = COALESCE(EXCLUDED.column_article_file, crawler_daily_runs.column_article_file),
           tech_news_file = COALESCE(EXCLUDED.tech_news_file, crawler_daily_runs.tech_news_file),
           updated_at = NOW()`,
        [
          dateStr,
          status,
          summaryInfo?.targetPath || summaryInfo?.columnTitle || null,
          summaryInfo?.digestFilePath || null,
        ]
      );
    } catch (err) {
      consola.warn("⚠️ 记录单日执行审计失败:", err);
    }
  }
}

// ==============================================================================
// 2. 内存/测试模式存储驱动 (MemoryDedupStore)
// ==============================================================================
export class MemoryDedupStore implements IDedupStore {
  private seenArticles = new Set<string>();
  private seenPapers = new Map<string, number>();
  private seenRepos = new Set<string>();
  private dailyRuns = new Set<string>();

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async filterNewItems<T>(
    sourceType: string,
    items: T[],
    keySelector: (item: T) => string
  ): Promise<T[]> {
    if (sourceType === "tech_news") {
      return items.filter((i) => !this.seenArticles.has(keySelector(i)));
    } else if (sourceType === "arxiv_papers") {
      const now = Date.now();
      const fourteenDays = 14 * 24 * 3600 * 1000;
      return items.filter((i) => {
        const lastSeen = this.seenPapers.get(keySelector(i));
        return !lastSeen || now - lastSeen > fourteenDays;
      });
    } else if (sourceType === "github_trending") {
      return items.filter((i) => !this.seenRepos.has(keySelector(i)));
    }
    return items;
  }

  async saveArticles(articles: any[]): Promise<number> {
    articles.forEach((a) => this.seenArticles.add(a.url));
    return articles.length;
  }

  async savePapers(papers: any[]): Promise<number> {
    const now = Date.now();
    papers.forEach((p) => this.seenPapers.set(p.paperId, now));
    return papers.length;
  }

  async saveRepos(repos: any[]): Promise<number> {
    repos.forEach((r) => this.seenRepos.add(r.repoName));
    return repos.length;
  }

  async checkIdempotency(taskName: string, dateStr: string): Promise<boolean> {
    return this.dailyRuns.has(`${taskName}:${dateStr}`);
  }

  async recordDailyRun(taskName: string, dateStr: string, status: string): Promise<void> {
    if (status === "success") {
      this.dailyRuns.add(`${taskName}:${dateStr}`);
    }
  }
}

// ==============================================================================
// 3. 本地轻量持久化存储驱动 (FileDedupStore / 0 外部依赖开箱即跑)
// ==============================================================================
export class FileDedupStore implements IDedupStore {
  private filePath: string;
  private seenArticles = new Set<string>();
  private seenPapers = new Map<string, number>();
  private seenRepos = new Set<string>();
  private dailyRuns = new Set<string>();

  constructor(filePath: string = "./data/radar_store.json") {
    this.filePath = filePath.endsWith(".db")
      ? filePath.replace(/\.db$/, ".json")
      : filePath;
  }

  async connect(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.seenArticles)) {
          this.seenArticles = new Set(data.seenArticles);
        }
        if (data.seenPapers && typeof data.seenPapers === "object") {
          this.seenPapers = new Map(Object.entries(data.seenPapers));
        }
        if (Array.isArray(data.seenRepos)) {
          this.seenRepos = new Set(data.seenRepos);
        }
        if (Array.isArray(data.dailyRuns)) {
          this.dailyRuns = new Set(data.dailyRuns);
        }
      }
    } catch (err) {
      consola.warn("⚠️ 本地存储驱动读取异常，将以纯净状态初始化:", err);
    }
  }

  async disconnect(): Promise<void> {
    this.persist();
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        seenArticles: Array.from(this.seenArticles),
        seenPapers: Object.fromEntries(this.seenPapers.entries()),
        seenRepos: Array.from(this.seenRepos),
        dailyRuns: Array.from(this.dailyRuns),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      consola.error("⚠️ 本地存储持久化失败:", err);
    }
  }

  async filterNewItems<T>(
    sourceType: string,
    items: T[],
    keySelector: (item: T) => string
  ): Promise<T[]> {
    if (sourceType === "tech_news") {
      return items.filter((i) => !this.seenArticles.has(keySelector(i)));
    } else if (sourceType === "arxiv_papers") {
      const now = Date.now();
      const fourteenDays = 14 * 24 * 3600 * 1000;
      return items.filter((i) => {
        const lastSeen = this.seenPapers.get(keySelector(i));
        return !lastSeen || now - lastSeen > fourteenDays;
      });
    } else if (sourceType === "github_trending") {
      return items.filter((i) => !this.seenRepos.has(keySelector(i)));
    }
    return items;
  }

  async saveArticles(articles: any[]): Promise<number> {
    articles.forEach((a) => this.seenArticles.add(a.url));
    this.persist();
    return articles.length;
  }

  async savePapers(papers: any[]): Promise<number> {
    const now = Date.now();
    papers.forEach((p) => this.seenPapers.set(p.paperId, now));
    this.persist();
    return papers.length;
  }

  async saveRepos(repos: any[]): Promise<number> {
    repos.forEach((r) => this.seenRepos.add(r.repoName));
    this.persist();
    return repos.length;
  }

  async checkIdempotency(taskName: string, dateStr: string): Promise<boolean> {
    return this.dailyRuns.has(`${taskName}:${dateStr}`);
  }

  async recordDailyRun(
    taskName: string,
    dateStr: string,
    status: string
  ): Promise<void> {
    if (status === "success") {
      this.dailyRuns.add(`${taskName}:${dateStr}`);
      this.persist();
    }
  }
}

// ==============================================================================
// 4. 存储驱动工厂函数
// ==============================================================================
export function createDedupStore(appConfig: AppConfig): IDedupStore {
  if (appConfig.storage.driver === "postgres") {
    return new PostgresDedupStore(appConfig.storage.databaseUrl);
  }
  if (appConfig.storage.driver === "sqlite") {
    return new FileDedupStore(appConfig.storage.sqlitePath);
  }
  return new MemoryDedupStore();
}
