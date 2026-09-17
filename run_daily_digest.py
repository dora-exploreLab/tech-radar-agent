"""
统一主入口调度兼容层 (Backward Compatibility Wrapper)
功能：
  1. 向后兼容现有 WSL2 systemd / crontab 定时调用；
  2. 自动转发调用现代 TypeScript 架构的 TechRadar-Harness 智能体 (pnpm start:daily)；
  3. 保障平滑过渡，零中断零感知。
"""
import sys
import os
import subprocess
import logging

current_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(current_dir, "logs")
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "daily_digest.log")

if sys.stdout.encoding != "utf-8" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("TechRadarBridge")

def run_ts_agent():
    logger.info("⚡ [Bridge] 转发调用 TechRadar-Harness 现代智能体流水线...")
    
    # 优先尝试使用 pnpm / tsx 运行
    commands = [
        ["pnpm", "start:daily"],
        ["npx", "tsx", "src/cli.ts", "run"],
        ["node", "dist/cli.js", "run"],
    ]

    for cmd in commands:
        try:
            # 在 Windows 环境下使用 shell=True 或解析可执行文件
            use_shell = sys.platform == "win32"
            res = subprocess.run(
                cmd if not use_shell else " ".join(cmd),
                cwd=current_dir,
                shell=use_shell,
                check=True
            )
            if res.returncode == 0:
                logger.info(f"✅ TechRadar-Harness 执行成功 (通过 {' '.join(cmd)})")
                return 0
        except Exception as e:
            logger.warning(f"⚠️ 尝试命令 {' '.join(cmd)} 失败: {e}，尝试备用命令...")

    logger.error("❌ 所有 TypeScript 调度命令均未能成功执行，请检查 Node.js / pnpm 环境。")
    return 1

if __name__ == "__main__":
    code = run_ts_agent()
    sys.exit(code)
