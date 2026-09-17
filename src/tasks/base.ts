import type { RuntimeContext } from "../core/context.js";
import type { AgentHarness } from "../core/harness.js";
import type { TaskType } from "../core/types.js";

// ==============================================================================
// 📦 可插拔领域任务抽象基类 (Base Task Contract)
// ==============================================================================
export abstract class BaseTask {
  abstract readonly name: TaskType;
  abstract readonly description: string;

  /**
   * 执行该任务的生命周期契约
   */
  abstract execute(context: RuntimeContext, harness: AgentHarness): Promise<string>;
}
