import path from "node:path";
import dayjs from "dayjs";
import { consola } from "consola";
import { BaseTask } from "./base.js";
import type { RuntimeContext } from "../core/context.js";
import type { AgentHarness } from "../core/harness.js";
import type { BookItem, TaskType } from "../core/types.js";
import { config } from "../config/index.js";

// ==============================================================================
// 📦 经典好书研读智库任务 (CS Books Task)
// ==============================================================================
export class CSBooksTask extends BaseTask {
  readonly name: TaskType = "cs_books";
  readonly description = "每月余数周期轮换，深度研读计算机经典好书并落地手册资料";

  private readonly library: BookItem[] = [
    {
      title: "数据密集型应用系统设计 (DDIA)",
      author: "Martin Kleppmann",
      focus: "分布式系统、数据复制、分区、事务、共识协议与衍生数据",
      whyRead: "深入理解现代分布式数据库、分布式锁、CAP 权衡与最终一致性体系的必读神作。",
      readingAdvice: "结合工业级存储引擎（如 RocksDB、PostgreSQL WAL）对照研读第七至第九章。",
    },
    {
      title: "深入理解计算机系统 (CS:APP)",
      author: "Randal E. Bryant / David R. O'Hallaron",
      focus: "机器级程序表示、处理器体系结构、存储器层次结构、链接、异常控制流与虚拟内存",
      whyRead: "全栈工程师穿透应用层黑盒、洞悉操作系统与硬件底层协同机制的硬核圣经。",
      readingAdvice: "重点研读第六章存储器层次结构与第九章虚拟内存，亲手编写 Cache Lab。",
    },
    {
      title: "架构整洁之道 (Clean Architecture)",
      author: "Robert C. Martin (Uncle Bob)",
      focus: "设计原则 (SOLID)、组件原则、依赖倒置与边界隔离",
      whyRead: "指导中大型微服务和复杂业务系统如何做到低耦合、可测试与易演进。",
      readingAdvice: "着重体会依赖倒置原则（DIP）与六边形架构在现代 TypeScript/Go 工程中的具象映射。",
    },
    {
      title: "软件系统设计与高可用架构 (SRE / Distributed Systems)",
      author: "Brendan Burns / Google SRE Team",
      focus: "服务等级目标 (SLO)、熔断限流、混沌工程与可观测性体系",
      whyRead: "高并发互联网企业如何保证 99.99% 可靠性运行的最佳实战总结。",
      readingAdvice: "对比实际线上事故排查与全链路压测复盘流程进行研读。",
    },
  ];

  async execute(context: RuntimeContext, harness: AgentHarness): Promise<string> {
    consola.info("📖 启动经典好书研读智库任务...");
    const start = Date.now();

    // 根据当前月份与日计算周期轮换索引
    const now = dayjs();
    const index = (now.month() + now.date()) % this.library.length;
    const book = this.library[index];

    // 生成完整的好书研读手册
    const bookFilePath = path.join(
      config.vault.booksDir,
      `${book.title.replace(/[\\/:*?"<>|]/g, "_")}.md`
    );

    const fullBookMarkdown = `---
title: "${book.title}"
author: "${book.author}"
category: "经典好书研读"
updated: ${context.runDate}
tags: ["架构", "经典著作", "深度思考"]
---

# 📖 ${book.title} - 架构深度研读笔记

> 💡 **核心定位**：${book.focus}  
> ✍️ **原著作者**：${book.author}

---

## 🎯 一、为什么全栈工程师必读此书？
${book.whyRead}

---

## 🏛️ 二、核心架构体系与思维模型
1. **认知穿透**：不再局限于上层框架语法，建立全局软硬件与分布式拓扑视角。
2. **权衡取舍 (Trade-offs)**：深刻领会任何工程架构均是延迟、吞吐、一致性与开发成本的综合权衡。
3. **分层契约**：自底向上的抽象泄漏防范机制与接口隔离契约。

---

## 💡 三、落地工程借鉴与实操建议
${book.readingAdvice}

---
*本笔记由 TechRadar-Harness 智能体于 ${context.runDate} 自动研读编排并沉淀至知识库。*
`;

    // 落地好书手册 (不影响今日待办勾选)
    await harness.actWriteObsidian(bookFilePath, fullBookMarkdown, false);

    // 格式化日报里的简炼展示块
    const formatter = harness.getFormatter();
    let dailySection = `${formatter.getMajorHeading(4, "经典计算机好书推荐与研读")}\n\n`;
    dailySection += `### 4.1 《${book.title}》 (${book.author})\n`;
    dailySection += `${formatter.formatMetrics([
      { label: "研究领域", value: book.focus },
      { label: "推荐指数", value: "⭐⭐⭐⭐⭐" },
    ])}\n\n`;
    dailySection += `- ${formatter.getHighlightsHeader()} ${book.whyRead}\n`;
    dailySection += `- ${formatter.getInsightHeader()} ${book.readingAdvice}\n\n`;

    context.recordMetric({
      taskType: this.name,
      fetchedCount: this.library.length,
      newCount: 1,
      processedCount: 1,
      durationMs: Date.now() - start,
      status: "success",
    });

    return dailySection;
  }
}
