import os
import sys

# ==========================================
# 🤖 大模型配置 (支持 DeepSeek / Kimi / OpenAI / 本地 Ollama)
# ==========================================
# 填入你的 DeepSeek API Key (例如 "sk-xxxxxxxx")，系统将开启大模型深度动态解析
# 若留空，系统会自动启动内置的高水准专家规则引擎与模板兜底，保证零断点运行
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

"""
全局配置模块 (Global Settings)
包含：知识库输出路径、网络代理配置、数据源列表与好书智库
"""
import os
import sys

# 自动判断当前是在 Windows 还是 WSL 环境
IS_WSL = "microsoft" in os.uname().release.lower() if hasattr(os, "uname") else False

if IS_WSL:
    VAULT_ROOT = os.environ.get("OBSIDIAN_VAULT_PATH", "/path/to/your/obsidian/vault")
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
else:
    VAULT_ROOT = os.environ.get("OBSIDIAN_VAULT_PATH", r"C:\path\to\your\obsidian\vault")
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
LOG_FILE = os.path.join(LOG_DIR, "daily_digest.log")

# 产出文件输出目标路径
OUTPUT_TECH_NEWS_DIR = os.environ.get("TECH_NEWS_DIR", os.path.join(VAULT_ROOT, "news"))
OUTPUT_PAPERS_DIR = os.environ.get("PAPERS_DIR", os.path.join(VAULT_ROOT, "papers"))
OUTPUT_BOOKS_DIR = os.environ.get("BOOKS_DIR", os.path.join(VAULT_ROOT, "books"))
TODO_FILE = os.environ.get("TODO_FILE_PATH", os.path.join(VAULT_ROOT, "todos.md"))

# 网络分流与代理配置
CLASH_PORT = int(os.environ.get("CLASH_PORT", 7897))
CLASH_HOST_WINDOWS = "127.0.0.1"
CLASH_HOST_WSL = "192.168.160.1"
CLASH_AUTH = os.environ.get("CLASH_AUTH", "")

# PostgreSQL 知识数仓连接配置 (Docker: personal-blog-postgres)
PG_HOST = os.environ.get("PG_HOST", "127.0.0.1")
PG_PORT = int(os.environ.get("PG_PORT", 5432))
PG_USER = os.environ.get("PG_USER", "dora_admin")
PG_PASSWORD = os.environ.get("PG_PASSWORD", "your_password_here")
PG_DBNAME = os.environ.get("PG_DBNAME", "crawler_db")

# 超轻量线程数 (保护 CPU 与带宽)
MAX_WORKERS = 3
REQUEST_TIMEOUT = 12

# 国内直连域名关键词 (绝对不走代理)
DOMESTIC_KEYWORDS = ["tech.meituan.com", "ruanyifeng.com", ".cn", "v2ex.com", "juejin.cn", "csdn.net"]

# 权威数据源矩阵配置
SOURCES = {
    "domestic": [
        {
            "name": "美团技术团队博客 (高并发/微服务/架构实战)",
            "url": "https://tech.meituan.com/feed",
            "type": "rss",
            "category": "国内大厂架构"
        },
        {
            "name": "阮一峰科技爱好者周刊 (前沿黑科技/独立产品/设计灵感)",
            "url": "http://www.ruanyifeng.com/blog/atom.xml",
            "type": "atom",
            "category": "科技前沿与产品"
        }
    ],
    "overseas": [
        {
            "name": "OpenAI 官方前沿与研究发布",
            "url": "https://openai.com/news/rss.xml",
            "type": "rss",
            "category": "大模型与顶尖前沿"
        },
        {
            "name": "Anthropic 官方研究与产品动态",
            "type": "anthropic_news",
            "category": "Anthropic 与 Claude 架构"
        },
        {
            "name": "Hacker News 硅谷极客热议 (AI/System)",
            "type": "hn_ai",
            "category": "硅谷极客热议"
        },
        {
            "name": "Neo4j Developer Blog (知识图谱与 GraphRAG)",
            "url": "https://neo4j.com/blog/developer/feed/",
            "type": "rss",
            "category": "GraphRAG 与智能体记忆"
        },
        {
            "name": "Simon Willison 博客 (AI 观察与工程实践)",
            "url": "https://simonwillison.net/atom/everything/",
            "type": "atom",
            "category": "AI微调与工程"
        },
        {
            "name": "Model Context Protocol (MCP 官方协议规范)",
            "repo": "modelcontextprotocol/specification",
            "type": "github_release",
            "category": "AI Agent"
        },
        {
            "name": "Model Context Protocol (MCP 核心服务器发布)",
            "repo": "modelcontextprotocol/servers",
            "type": "github_release",
            "category": "AI Agent"
        },
        {
            "name": "Hugging Face Engineering Blog (大模型微调PEFT/TRL实战)",
            "url": "https://huggingface.co/blog/feed.xml",
            "type": "rss",
            "category": "AI微调与工程"
        },
        {
            "name": "Cloudflare Engineering (全球高并发/边缘计算/网络底层)",
            "url": "https://blog.cloudflare.com/rss/",
            "type": "rss",
            "category": "后端与高并发"
        },
        {
            "name": "LWN.net (Linux Kernel 内核底层前沿内参)",
            "url": "https://lwn.net/headlines/rss",
            "type": "rss",
            "category": "操作系统与内核"
        },
        {
            "name": "Microsoft TypeScript DevBlog (类型系统与编译器底层)",
            "url": "https://devblogs.microsoft.com/typescript/feed/",
            "type": "rss",
            "category": "现代全栈"
        },
        {
            "name": "React 官方核心发布",
            "repo": "facebook/react",
            "type": "github_release",
            "category": "现代全栈"
        },
    ]
}

OUTPUT_COLUMN_DIR = os.environ.get("COLUMN_DIR", os.path.join(VAULT_ROOT, "columns"))
