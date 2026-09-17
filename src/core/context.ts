import dayjs from "dayjs";
import type { TaskType } from "./types.js";

// ==============================================================================
// 智能体运行时上下文与遥测审计 (Runtime Context & Telemetry)
// ==============================================================================
export interface TaskMetric {
  taskType: TaskType;
  fetchedCount: number;
  newCount: number;
  processedCount: number;
  durationMs: number;
  status: "success" | "skipped" | "failed";
  note?: string;
}

export class RuntimeContext {
  public readonly runDate: string;
  public readonly weekday: string;
  public readonly startedAt: Date;
  public readonly metrics: Map<TaskType, TaskMetric> = new Map();
  public readonly sharedArtifacts: Map<string, any> = new Map();
  public readonly auditLogs: Array<{ time: string; message: string }> = [];

  constructor(dateOverride?: string) {
    const d = dateOverride ? dayjs(dateOverride) : dayjs();
    this.runDate = d.format("YYYY-MM-DD");
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    this.weekday = weekdays[d.day()];
    this.startedAt = new Date();
  }

  recordMetric(metric: TaskMetric): void {
    this.metrics.set(metric.taskType, metric);
  }

  log(message: string): void {
    this.auditLogs.push({
      time: dayjs().format("HH:mm:ss.SSS"),
      message,
    });
  }

  setArtifact<T>(key: string, data: T): void {
    this.sharedArtifacts.set(key, data);
  }

  getArtifact<T>(key: string): T | undefined {
    return this.sharedArtifacts.get(key) as T | undefined;
  }

  getSummary(): {
    date: string;
    totalTasks: number;
    completedTasks: number;
    totalNewAssets: number;
    durationMs: number;
  } {
    let totalNew = 0;
    let completed = 0;
    this.metrics.forEach((m) => {
      if (m.status === "success") completed++;
      totalNew += m.newCount;
    });

    return {
      date: this.runDate,
      totalTasks: this.metrics.size,
      completedTasks: completed,
      totalNewAssets: totalNew,
      durationMs: Date.now() - this.startedAt.getTime(),
    };
  }
}
