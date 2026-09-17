import fs from "node:fs/promises";
import path from "node:path";
import { consola } from "consola";
import type { AppConfig } from "../config/index.js";

// ==============================================================================
// Obsidian 知识库沉淀与今日待办打卡适配器 (Vault Adapter)
// ==============================================================================
export class VaultAdapter {
  constructor(private config: AppConfig["vault"]) {}

  /**
   * 安全写入 Markdown 文件，自动递归创建缺失的父级目录
   */
  async writeMarkdown(targetPath: string, content: string): Promise<void> {
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(targetPath, content, "utf-8");
  }

  /**
   * 同步今日待办打卡状态 (可选)
   */
  async syncTodoItem(
    keyword: string = "技术快讯与前沿文献",
    statusNote: string = "已全自动归档"
  ): Promise<boolean> {
    try {
      const todoPath = this.config.todoFile;
      let content: string;
      try {
        content = await fs.readFile(todoPath, "utf-8");
      } catch {
        return false;
      }

      const pattern = new RegExp(`- \\[ \\] (.*?${keyword}.*?)(?:\\r?\\n)`, "i");
      if (pattern.test(content)) {
        const updated = content.replace(pattern, `- [x] $1 (${statusNote})\n`);
        await fs.writeFile(todoPath, updated, "utf-8");
        consola.success(`📋 今日待办已自动勾选打卡: [${keyword}]`);
        return true;
      }
      return false;
    } catch (err) {
      consola.warn("⚠️ 同步今日待办打卡异常:", err);
      return false;
    }
  }
}
