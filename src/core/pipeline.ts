import { consola } from "consola";
import type { BaseTask } from "../tasks/base.js";
import type { RuntimeContext } from "./context.js";
import type { AgentHarness } from "./harness.js";

// ==============================================================================
// 🚦 智能体任务调度管线 (Task Pipeline)
// ==============================================================================
export class TaskPipeline {
  private tasks: BaseTask[] = [];

  registerTask(task: BaseTask): this {
    this.tasks.push(task);
    return this;
  }

  async runAll(
    context: RuntimeContext,
    harness: AgentHarness
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const task of this.tasks) {
      try {
        consola.start(`[Pipeline] 调度子任务 -> ${task.name}`);
        const output = await task.execute(context, harness);
        results.set(task.name, output);
        consola.success(`[Pipeline] 子任务完成 -> ${task.name}`);
      } catch (err: any) {
        consola.error(`[Pipeline] 子任务异常 -> ${task.name}:`, err);
        context.recordMetric({
          taskType: task.name,
          fetchedCount: 0,
          newCount: 0,
          processedCount: 0,
          durationMs: 0,
          status: "failed",
          note: err.message || String(err),
        });
      }
    }

    return results;
  }
}
