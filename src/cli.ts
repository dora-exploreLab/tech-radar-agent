import { Command } from "commander";
import chalk from "chalk";
import consola from "consola";
import { TechRadarAgent } from "./core/agent.js";
import { config } from "./config/index.js";

// ==============================================================================
// 💻 极客终端交互命令行入口 (TechRadar CLI)
// ==============================================================================

const program = new Command();

function printBanner(): void {
  console.log(
    chalk.cyanBright(`
   _______        _     ____           _             
  |__   __|      | |   |  _ \\         | |            
     | | ___  ___| |__ | |_) | __ _  __| | __ _ _ __  
     | |/ _ \\/ __| '_ \\|  _ < / _\` |/ _\` |/ _\` | '__| 
     | |  __/ (__| | | | |_) | (_| | (_| | (_| | |    
     |_|\\___|\\___|_| |_|____/ \\__,_|\\__,_|\\__,_|_|    
                                                      
   ⚡ Autonomous Tech Radar & Knowledge Distillation Agent Harness
   ------------------------------------------------------------
`)
  );
}

program
  .name("radar")
  .description("⚡ Autonomous Tech Radar & Knowledge Distillation Agent Harness")
  .version("1.0.0");

program
  .command("run")
  .description("🚀 触发全栈技术雷达每日感知、排重、萃取与沉淀流水线")
  .option("-d, --date <date>", "指定目标日期 (格式: YYYY-MM-DD)")
  .option("-p, --proxy <url>", "覆盖代理服务器地址")
  .option("--no-proxy", "禁用所有代理，强制直连")
  .option("--driver <driver>", "临时切换数仓驱动 (postgres | sqlite | memory)")
  .action(async (opts) => {
    printBanner();

    if (opts.proxy) {
      config.network.proxyUrl = opts.proxy;
      config.network.proxyMode = "always";
      consola.info(`🔌 覆盖代理配置 -> ${opts.proxy}`);
    } else if (opts.proxy === false) {
      config.network.proxyMode = "never";
      consola.info(`🔌 强制直连模式 (No Proxy)`);
    }

    if (opts.driver) {
      config.storage.driver = opts.driver;
      consola.info(`🗄️ 切换存储驱动 -> ${opts.driver}`);
    }

    const agent = new TechRadarAgent();

    try {
      await agent.init();
      const summary = await agent.runDailyDigest(opts.date);

      console.log("\n" + chalk.greenBright("═".repeat(60)));
      consola.success(chalk.bold.green(`🎉 技术雷达流水线执行完毕!`));
      console.log(chalk.gray(`📅 执行日期: `) + chalk.white(summary.date));
      console.log(chalk.gray(`📦 调度任务: `) + chalk.white(`${summary.completedTasks}/${summary.totalTasks} 成功`));
      console.log(chalk.gray(`✨ 新增资产: `) + chalk.white(`${summary.totalNewAssets} 篇/条`));
      console.log(chalk.gray(`⏱️ 总计耗时: `) + chalk.white(`${(summary.durationMs / 1000).toFixed(2)} 秒`));
      console.log(chalk.gray(`📄 产出文档: `) + chalk.yellow(summary.digestFilePath));
      console.log(chalk.greenBright("═".repeat(60)) + "\n");
    } catch (err) {
      consola.error("❌ 智能体运行遇到严重错误:", err);
      process.exitCode = 1;
    } finally {
      await agent.close();
    }
  });

program
  .command("status")
  .description("🔍 检查基础设施健康状况 (数仓/代理/知识库/LLM)")
  .action(async () => {
    printBanner();
    consola.info("正在体检底层基础设施状态...\n");

    console.log(chalk.bold("1. 存储数仓 (Storage)"));
    console.log(`   - 驱动类型: ${chalk.cyan(config.storage.driver)}`);
    console.log(`   - 连接目标: ${chalk.gray(config.storage.databaseUrl)}`);

    console.log(chalk.bold("\n2. 网络路由 (Network)"));
    console.log(`   - 代理模式: ${chalk.cyan(config.network.proxyMode)}`);
    console.log(`   - 代理地址: ${chalk.gray(config.network.proxyUrl)}`);
    console.log(`   - 直连白名单: ${chalk.gray(config.network.domesticDomains.join(", "))}`);

    console.log(chalk.bold("\n3. 大模型认知层 (LLM)"));
    console.log(`   - 服务地址: ${chalk.cyan(config.llm.baseUrl)}`);
    console.log(`   - 默认模型: ${chalk.cyan(config.llm.model)}`);
    console.log(`   - Key 状态: ${config.llm.apiKey ? chalk.green("已配置") : chalk.yellow("未配置 (将使用降级模板)")}`);

    console.log(chalk.bold("\n4. 知识库输出 (Vault)"));
    console.log(`   - 根目录: ${chalk.gray(config.vault.rootDir)}`);
    console.log(`   - 待办清单: ${chalk.gray(config.vault.todoFile)}`);
  });

program.parse(process.argv);
