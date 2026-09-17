import { z } from "zod";

// ==========================================
// 1. 任务类型与状态枚举
// ==========================================
export type TaskType =
  | "github_trending"
  | "arxiv_papers"
  | "tech_news"
  | "cs_books"
  | "column_synthesizer";

export type TaskStatus = "pending" | "running" | "completed" | "skipped" | "failed";

// ==========================================
// 2. 原始感知条目与通用元数据
// ==========================================
export interface RawItem {
  id?: string;
  title: string;
  url: string;
  source: string;
  category?: string;
  rawContent?: string;
  metadata?: Record<string, any>;
  publishedAt?: Date | string;
}

// ==========================================
// 3. 结构化 LLM 萃取 Schema 契约 (Zod)
// ==========================================
export const TechSummarySchema = z.object({
  title_zh: z.string().min(4).max(30).describe("简炼、极具吸引力的中文标题（严格控制在30字以内）"),
  pain_point: z.string().min(20).describe("该项目/论文/文章解决的核心痛点背景与行业背景"),
  core_mechanism: z.string().min(20).describe("其底层核心技术机制与算法/架构突破"),
  feature_threshold: z.string().min(15).describe("关键特性、生态定位或开发者使用门槛"),
  engineering_takeaway: z.string().min(20).describe("对企业级系统设计或全栈工程师的落地工程借鉴启示"),
  tags: z.array(z.string()).default([]),
});

export type TechSummary = z.infer<typeof TechSummarySchema>;

// GitHub Trending 结构化条目
export interface GitHubRepoItem {
  name: string;
  url: string;
  description: string;
  starsToday: string;
  totalStars?: string;
  language: string;
  summaryZh?: TechSummary;
}

// ArXiv 论文结构化条目
export interface ArxivPaperItem {
  paperId: string;
  title: string;
  titleZh: string;
  url: string;
  authors: string[];
  published: string;
  summary: string;
  deepBreakthrough?: TechSummary;
}

// 大厂工程快讯条目
export interface TechNewsItem {
  title: string;
  url: string;
  sourceName: string;
  category: string;
  summaryZh?: TechSummary;
  publishedAt?: string;
}

// 经典好书研读条目
export interface BookItem {
  title: string;
  author: string;
  focus: string;
  whyRead: string;
  readingAdvice: string;
}

// ==========================================
// 4. Action 与 Harness 核心契约
// ==========================================
export interface ActionResult<T = any> {
  success: boolean;
  actionName: string;
  data?: T;
  error?: Error;
  durationMs: number;
}

export interface FetchOptions {
  isDomestic?: boolean;
  timeoutMs?: number;
  headers?: Record<string, string>;
  responseType?: "text" | "json";
}

// 数仓存储统一抽象契约 (IDedupStore)
export interface IDedupStore {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  filterNewItems<T>(sourceType: string, items: T[], keySelector: (item: T) => string): Promise<T[]>;
  saveArticles(articles: Array<{ title: string; url: string; source: string; category?: string; summary?: string }>): Promise<number>;
  savePapers(papers: Array<{ paperId: string; title: string; url: string; authors?: string; category?: string; summaryZh?: string }>): Promise<number>;
  saveRepos(repos: Array<{ repoName: string; url: string; stars?: string; language?: string; summaryZh?: string }>): Promise<number>;
  checkIdempotency(taskName: string, dateStr: string): Promise<boolean>;
  recordDailyRun(taskName: string, dateStr: string, status: string, summaryInfo?: any): Promise<void>;
}
