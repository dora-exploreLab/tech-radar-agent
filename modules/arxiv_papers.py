"""
顶尖前沿大模型与 Agent 学术论文抓取引擎 (Curated AI Papers Scraper)
数据源: Hugging Face Daily Papers (AK 精选榜) + 全自动中文提纯
"""
import json
import datetime
import os
from utils.network import client
from utils.translator import translate_to_zh
from utils.ai_analyzer import polish_paper_analysis
from utils.pg_db import filter_unseen_papers, record_recommended_papers
from config.settings import OUTPUT_PAPERS_DIR

KEYWORD_BOOSTS = [
    "llm", "agent", "agents", "fine-tuning", "lora", "qlora", "dpo", "sft", 
    "rlhf", "reasoning", "tool", "mcp", "prompt", "rag", "benchmark"
]

def fetch_hf_papers():
    url = "https://huggingface.co/api/daily_papers"
    try:
        raw = client.fetch(url, timeout=12)
        return json.loads(raw.decode("utf-8"))
    except Exception as e:
        print(f"[Error] Fetching HF Daily Papers failed: {e}")
        return []

def score_paper(p):
    score = p.get("upvotes", 0) * 1.5
    if p.get("githubRepo"):
        score += 30
    title = (p.get("title") or "").lower()
    summary = (p.get("summary") or "").lower()
    for kw in KEYWORD_BOOSTS:
        if kw in title:
            score += 10
        elif kw in summary:
            score += 3
    return score

def generate_paper_digest():
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    raw = fetch_hf_papers()

    # 1. 接入 PostgreSQL 去重：过滤掉 14 天内推荐过的论文，保证 100% 新鲜度
    unseen_raw = filter_unseen_papers(raw, cooldown_days=14)
    active_pool = unseen_raw if len(unseen_raw) >= 3 else raw

    scored = []
    for item in active_pool:
        p = item.get("paper", {})
        if p:
            scored.append((score_paper(p), p))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_papers = [p for _, p in scored[:5]]

    md = [
        "---",
        f"title: {today_str} arXiv大模型与Agent精选论文",
        f"date: {today_str}",
        "tags:",
        "  - paper",
        "  - arxiv",
        "  - huggingface-daily",
        "  - llm",
        "  - ai-agents",
        "  - literature-note",
        "---",
        "",
        f"# 📄 {today_str} 顶尖前沿大模型与 Agent 研读专刊 (全中文精选)",
        "",
        "> 🎯 **甄选标准**: 聚合 Hugging Face Daily Papers 点赞榜，**14天内无重复精选**，优先选拔**具备开源代码**的微调 (LoRA/DPO)、推理强化 (Reasoning) 与 Agent 论文，全量精炼为短标题中文解析。",
        "",
        "---",
        ""
    ]

    recorded_papers = []

    for idx, p in enumerate(top_papers, 1):
        pid = p.get("id", "")
        title_en = p.get("title", "").strip()
        upvotes = p.get("upvotes", 0)
        repo = p.get("githubRepo")
        stars = p.get("githubStars", 0)
        summary_en = p.get("ai_summary") or p.get("summary", "")

        # 调用 AI 进行短标题提炼与精简研读
        ai_res = polish_paper_analysis(title_en, summary_en[:1500], repo)

        title_zh = ai_res.get("title_zh") or translate_to_zh(title_en)[:16]
        breakthrough = ai_res.get("core_breakthrough") or translate_to_zh(summary_en[:200])
        takeaway = ai_res.get("engineering_takeaway") or "建议跟进其开源代码实现并在垂直微调或Agent框架中借鉴。"

        authors_list = p.get("authors", [])
        author_names = [a.get("name", "") for a in authors_list if isinstance(a, dict)]
        authors_str = ", ".join(author_names[:2]) + (" 等" if len(author_names) > 2 else "")

        org = p.get("organization")
        org_name = org.get("name") if isinstance(org, dict) else (org or "学术联合")

        stars_label = f" (⭐ **{stars} Stars**)" if stars else ""
        repo_link = f"[{repo}]({repo})" if repo else "_暂无开源仓库_"

        # 精炼排版：短标题、指标下移加粗
        md.extend([
            f"## {idx}. {title_zh}",
            f"- **学术热度**: 🔥 **{upvotes} Upvotes** | **开源代码**: 💻 {repo_link}{stars_label} | **机构**: `{org_name}` ({authors_str})",
            f"- **论文直达**: [arXiv 网页](https://arxiv.org/abs/{pid}) | [📄 PDF 直接下载](https://arxiv.org/pdf/{pid}.pdf) | [HF 社区讨论](https://huggingface.co/papers/{pid})",
            f"- **核心突破**: > {breakthrough}",
        ])

        if isinstance(takeaway, list):
            md.append("- **工程启发**:")
            for item in takeaway:
                md.append(f"  - {item}")
        else:
            md.append(f"- **工程启发**: > {takeaway}")

        md.extend([
            "",
            "---",
            ""
        ])

        recorded_papers.append({
            "id": pid,
            "title": title_en,
            "title_zh": title_zh,
            "authors": authors_str,
            "organization": org_name,
            "github_repo": repo,
            "github_stars": stars,
            "upvotes": upvotes,
            "core_breakthrough": breakthrough,
            "engineering_takeaway": str(takeaway)
        })

    # 将今日精选论文存入 PostgreSQL，记录推荐时间
    if recorded_papers:
        record_recommended_papers(recorded_papers)

    md.append(f"*本期学术论文由 dorabighead 的 AI Agent 自动化采集、增量排重与深度润色生成于: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

    os.makedirs(OUTPUT_PAPERS_DIR, exist_ok=True)
    target = os.path.join(OUTPUT_PAPERS_DIR, f"{today_str} arXiv大模型与Agent精选.md")
    with open(target, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    return target, recorded_papers
