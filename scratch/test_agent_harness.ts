import { consola } from "consola";
import { config, formatter } from "../src/config/index.js";
import { createDedupStore } from "../src/adapters/db.js";
import { NetworkAdapter } from "../src/adapters/network.js";
import { AgentHarness } from "../src/core/harness.js";
import { TechSummarySchema } from "../src/core/types.js";

async function runTests() {
  consola.info("🧪 启动 TechRadar-Harness 核心架构与功能自动化测试...\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (!condition) {
      consola.error(`❌ 测试失败: ${msg}`);
      throw new Error(msg);
    }
    consola.success(`✅ 测试通过: ${msg}`);
    passed++;
  }

  // 1. 测试排版引擎与模版解耦
  consola.info("--- 测试 1: 排版引擎与规范契约 ---");
  const majorHeading = formatter.getMajorHeading(1, "GitHub 今日爆款开源热榜");
  assert(majorHeading === "## 一、GitHub 今日爆款开源热榜", `大项汉字编号应为 '## 一、'，实际为 '${majorHeading}'`);

  const subHeading = formatter.getSubItemHeading(
    1,
    2,
    "Claude知识工作插件集",
    "anthropics/mcp",
    "https://github.com/anthropics/mcp"
  );
  assert(
    subHeading === "### 1.2 Claude知识工作插件集 ([anthropics/mcp](https://github.com/anthropics/mcp))",
    `子项应包含 '1.2' 编号及仓库链接，实际为 '${subHeading}'`
  );

  const sanitized = formatter.sanitize("这是关于内核架构启示与前沿内参的分析");
  assert(!sanitized.includes("内参"), "应彻底过滤'内参'老派用词");
  assert(sanitized.includes("💡 工程借鉴"), "应将'架构启示'自动更替为'💡 工程借鉴'");

  const metricsLine = formatter.formatMetrics([
    { label: "今日新增 Star", value: "+3,210" },
    { label: "主要语言", value: "Go" },
    { label: "开源仓库", value: "alibaba/open-code-review", url: "https://github.com/alibaba/open-code-review" },
  ]);
  assert(metricsLine.includes("**今日新增 Star**: +3,210"), "指标应加粗独立展示");

  // 2. 测试智能网络分流与白名单
  consola.info("\n--- 测试 2: 智能网络路由与代理分流 ---");
  const network = new NetworkAdapter(config.network);
  assert(network.isDomesticUrl("https://tech.meituan.com/feed") === true, "美团技术博客应被判定为国内直连");
  assert(network.isDomesticUrl("https://ruanyifeng.com/blog/atom.xml") === true, "阮一峰周刊应被判定为国内直连");
  assert(network.isDomesticUrl("https://github.com/trending") === false, "GitHub 域名应走海外代理分流");
  assert(network.isDomesticUrl("https://arxiv.org/abs/2409.11201") === false, "ArXiv 域名应走海外代理分流");

  // 3. 测试 Zod 数据契约与 Critic 约束
  consola.info("\n--- 测试 3: Zod 严格模式与 Schema 校验 ---");
  const validSummary = {
    title_zh: "iOS命令行虚拟手机环境",
    pain_point: "移动端自动化测试严重受限于真实硬件成本与图形界面依赖，无法大规模在 CI/CD 容器中并发运行。",
    core_mechanism: "利用低开销用户态模拟器与虚拟化驱动，将 iOS 系统调用直接映射至无头终端，实现极低内存占用。",
    feature_threshold: "支持一键 Docker 部署，对宿主机资源要求仅需 2 核 4G，上手成本极低。",
    engineering_takeaway: "将复杂的系统黑盒通过标准 CLI 协议彻底解耦暴露，能极大释放自动化集成测试的工程效率。",
    tags: ["iOS", "Virtualization", "CLI"],
  };

  const parsed = TechSummarySchema.safeParse(validSummary);
  assert(parsed.success === true, "合规数据应 100% 通过 Zod Schema 校验");

  // 4. 测试 PostgreSQL 数仓连通与去重接口
  consola.info("\n--- 测试 4: PostgreSQL 数仓适配器 ---");
  const db = createDedupStore(config);
  await db.connect();
  assert(true, "PostgreSQL 知识数仓连接成功");

  const testItems = [
    { url: "https://tech.meituan.com/already_seen_test", title: "测试" },
    { url: `https://tech.meituan.com/new_item_${Date.now()}`, title: "新条目" },
  ];
  const filtered = await db.filterNewItems("tech_news", testItems, (i) => i.url);
  assert(Array.isArray(filtered), "排重过滤接口应正常返回候选数组");

  await db.disconnect();

  consola.info(`\n🎉 全部 ${passed}/${total} 项单元与集成断言 100% 通过！`);
}

runTests().catch((err) => {
  consola.error("测试运行失败:", err);
  process.exit(1);
});
