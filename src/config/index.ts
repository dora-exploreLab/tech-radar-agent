import path from "node:path";
import os from "node:os";
import dotenv from "dotenv";
import { z } from "zod";
import { TYPOGRAPHY_PRESETS, type TypographyConfig, TypographyFormatter } from "./typography.js";

// 加载 .env
dotenv.config();

// ==========================================
// 1. 跨平台环境与路径解析
// ==========================================
const isWSL = os.release().toLowerCase().includes("microsoft");

function resolveDefaultVaultPath(): string {
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return process.env.OBSIDIAN_VAULT_PATH;
  }
  return path.join(process.cwd(), "vault");
}

// ==========================================
// 2. 强类型配置契约 (Zod Schema)
// ==========================================
const ConfigSchema = z.object({
  llm: z.object({
    baseUrl: z.string().default("https://api.deepseek.com/v1"),
    apiKey: z.string().default(""),
    model: z.string().default("deepseek-chat"),
    maxRetries: z.coerce.number().default(2),
  }),
  network: z.object({
    proxyMode: z.enum(["auto", "always", "never"]).default("auto"),
    proxyUrl: z.string().default("http://127.0.0.1:7897"),
    proxyAuth: z.string().optional(),
    domesticDomains: z.array(z.string()).default([
      "tech.meituan.com",
      "ruanyifeng.com",
      ".cn",
      "v2ex.com",
      "juejin.cn",
      "csdn.net",
    ]),
    timeoutMs: z.coerce.number().default(15000),
  }),
  storage: z.object({
    driver: z.enum(["postgres", "sqlite", "memory"]).default("postgres"),
    databaseUrl: z
      .string()
      .default("postgresql://postgres:password@127.0.0.1:5432/crawler_db"),
    sqlitePath: z.string().default("./data/radar.db"),
  }),
  vault: z.object({
    rootDir: z.string(),
    techNewsDir: z.string(),
    papersDir: z.string(),
    booksDir: z.string(),
    columnDir: z.string(),
    todoFile: z.string(),
  }),
  typography: z.custom<TypographyConfig>(),
  tasks: z.object({
    enabled: z.array(z.string()).default(["github", "papers", "news", "books", "synthesizer"]),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// ==========================================
// 3. 配置组装与单例导出
// ==========================================
const vaultRoot = resolveDefaultVaultPath();
const themeName = process.env.TYPOGRAPHY_THEME || "geek";
const typographyConfig = TYPOGRAPHY_PRESETS[themeName] || TYPOGRAPHY_PRESETS.geek;

const rawDomesticDomains = process.env.DOMESTIC_DOMAINS
  ? process.env.DOMESTIC_DOMAINS.split(",").map((s) => s.trim()).filter(Boolean)
  : undefined;

const rawTasks = process.env.TASKS_ENABLED
  ? process.env.TASKS_ENABLED.split(",").map((s) => s.trim()).filter(Boolean)
  : undefined;

export const config: AppConfig = ConfigSchema.parse({
  llm: {
    baseUrl: process.env.LLM_BASE_URL || "https://api.deepseek.com/v1",
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || "deepseek-chat",
    maxRetries: process.env.LLM_MAX_RETRIES || 2,
  },
  network: {
    proxyMode: (process.env.PROXY_MODE as any) || "auto",
    proxyUrl: process.env.PROXY_URL || "http://127.0.0.1:7897",
    proxyAuth: process.env.PROXY_AUTH || undefined,
    domesticDomains: rawDomesticDomains,
    timeoutMs: process.env.REQUEST_TIMEOUT ? Number(process.env.REQUEST_TIMEOUT) * 1000 : 15000,
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER as any) || "postgres",
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@127.0.0.1:5432/crawler_db",
    sqlitePath: process.env.SQLITE_PATH || "./data/radar.db",
  },
  vault: {
    rootDir: vaultRoot,
    techNewsDir: process.env.TECH_NEWS_DIR || path.join(vaultRoot, "news"),
    papersDir: process.env.PAPERS_DIR || path.join(vaultRoot, "papers"),
    booksDir: process.env.BOOKS_DIR || path.join(vaultRoot, "books"),
    columnDir: process.env.COLUMN_DIR || path.join(vaultRoot, "columns"),
    todoFile: process.env.TODO_FILE_PATH || path.join(vaultRoot, "todos.md"),
  },
  typography: typographyConfig,
  tasks: {
    enabled: rawTasks,
  },
});

export const formatter = new TypographyFormatter(config.typography);
