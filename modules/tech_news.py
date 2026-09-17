"""
全领域工程内参与产品技术速递抓取引擎 (Curated Full-Stack Tech & Product News)
涵盖：
  - 🔥 GitHub Trending 今日爆款开源热榜 (带 AI 架构分析)
  - 🤖 顶尖前沿大模型 (OpenAI、Anthropic 官方研究与发布)
  - 🧠 智能体与知识图谱 (MCP、Neo4j GraphRAG、Simon Willison)
  - 🌐 硅谷极客热议 (Hacker News AI 精选)
  - 🏢 工业级实战 (国内美团技术、海外 Cloudflare、Linux 内核、TypeScript)
  - 💡 顶级产品思维 (阮一峰周刊、YC、Figma)
"""
import xml.etree.ElementTree as ET
import json
import datetime
import re
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from utils.network import client
from utils.translator import translate_to_zh
from utils.ai_analyzer import polish_news_item
from utils.pg_db import filter_unseen_articles, record_recommended_articles
from modules.github_trending import fetch_github_trending
from config.settings import SOURCES, MAX_WORKERS, OUTPUT_TECH_NEWS_DIR

def clean_html(text):
    if not text:
        return ""
    cleanr = re.compile(r"<.*?>")
    cleantext = re.sub(cleanr, "", text)
    return cleantext.strip().replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'")

def fetch_rss_feed(source_item, limit=10):
    url = source_item.get("url")
    items = []
    try:
        raw = client.fetch(url, timeout=12)
        root = ET.fromstring(raw)
        
        # 兼容 Atom 格式
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        atom_entries = root.findall("./atom:entry", ns) or root.findall("./entry") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
        if atom_entries:
            for entry in atom_entries[:limit]:
                title = entry.find("atom:title", ns) or entry.find("title") or entry.find(".//{http://www.w3.org/2005/Atom}title")
                link = entry.find("atom:link", ns) or entry.find("link") or entry.find(".//{http://www.w3.org/2005/Atom}link")
                href = ""
                if link is not None:
                    href = link.attrib.get("href") or link.text or ""
                summary = entry.find("atom:summary", ns) or entry.find("summary") or entry.find("content") or entry.find(".//{http://www.w3.org/2005/Atom}summary")
                text_content = summary.text if summary is not None and summary.text else ""
                items.append({
                    "title": title.text.strip() if title is not None and title.text else "",
                    "url": href.strip(),
                    "desc": clean_html(text_content)[:240]
                })
        else:
            # RSS channel/item
            for item in root.findall("./channel/item")[:limit]:
                title = item.find("title")
                link = item.find("link")
                desc = item.find("description")
                items.append({
                    "title": title.text.strip() if title is not None and title.text else "",
                    "url": link.text.strip() if link is not None and link.text else "",
                    "desc": clean_html(desc.text if desc is not None and desc.text else "")[:240]
                })
    except Exception as e:
        print(f"[Warning] Fetching {source_item.get('name')} failed: {e}")
    return items

def fetch_github_release(source_item, limit=5):
    repo = source_item.get("repo")
    url = f"https://api.github.com/repos/{repo}/releases?per_page={limit}"
    items = []
    try:
        raw = client.fetch(url, timeout=12)
        data = json.loads(raw.decode("utf-8"))
        for r in data[:limit]:
            name = r.get("name") or r.get("tag_name") or "New Release"
            body = clean_html(r.get("body") or "")[:200]
            items.append({
                "title": f"{repo} {name}",
                "url": r.get("html_url"),
                "desc": body
            })
    except Exception as e:
        print(f"[Warning] Fetching release for {repo} failed: {e}")
    return items

def fetch_anthropic_news(source_item, limit=10):
    items = []
    try:
        html = client.fetch("https://www.anthropic.com/news", timeout=15).decode("utf-8", errors="ignore")
        matches = re.findall(r'<a[^>]+href="(/news/[^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
        seen = set()
        for link, text in matches:
            clean_text = clean_html(text)
            clean_text = re.sub(r'\s+', ' ', clean_text)
            if clean_text and link not in seen and len(clean_text) > 10 and not clean_text.lower().startswith('read'):
                seen.add(link)
                items.append({
                    "title": clean_text[:120],
                    "url": f"https://www.anthropic.com{link}",
                    "desc": clean_text[120:320] if len(clean_text) > 120 else "Anthropic 官方前沿技术与 Claude 架构演进"
                })
                if len(items) >= limit:
                    break
    except Exception as e:
        print(f"[Warning] Fetching Anthropic failed: {e}")
    return items

def fetch_hn_ai(source_item, limit=15):
    items = []
    try:
        raw = client.fetch("https://news.ycombinator.com/rss", timeout=15)
        root = ET.fromstring(raw)
        ai_keywords = ["ai", "llm", "agent", "gpt", "claude", "model", "deepseek", "neural", "gpu", "rag", "eval", "code", "compiler", "rust", "database", "memory"]
        for item in root.findall("./channel/item"):
            t = item.find("title")
            l = item.find("link")
            title_text = t.text.strip() if t is not None and t.text else ""
            link_text = l.text.strip() if l is not None and l.text else ""
            if any(kw in title_text.lower().split() or kw in title_text.lower() for kw in ai_keywords):
                items.append({
                    "title": title_text,
                    "url": link_text,
                    "desc": "Hacker News 硅谷技术社区关于 AI 与系统架构的高热度讨论"
                })
                if len(items) >= limit:
                    break
    except Exception as e:
        print(f"[Warning] Fetching Hacker News failed: {e}")
    return items

def generate_tech_digest():
    today = datetime.date.today()
    today_str = today.strftime("%Y-%m-%d")
    weekdays_zh = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
    weekday_str = weekdays_zh[today.weekday()]

    print(">> [1/2] 正在拉取 GitHub Trending 今日飙升榜并进行 AI 架构深度剖析...")
    trending_repos = fetch_github_trending(5)

    print(">> [2/2] 正在多线程并发拉取国内外前沿资讯矩阵并进行 PostgreSQL 去重...")
    all_sources = SOURCES["domestic"] + SOURCES["overseas"]
    
    results = {}
    all_recommended_articles = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_map = {}
        for s in all_sources:
            stype = s.get("type")
            if stype == "github_release":
                f = executor.submit(fetch_github_release, s, 5)
            elif stype == "anthropic_news":
                f = executor.submit(fetch_anthropic_news, s, 8)
            elif stype == "hn_ai":
                f = executor.submit(fetch_hn_ai, s, 10)
            else:
                f = executor.submit(fetch_rss_feed, s, 10)
            future_map[f] = s

        for future in as_completed(future_map):
            s = future_map[future]
            try:
                raw_items = future.result()
                if raw_items:
                    # 使用 PostgreSQL 去重：过滤出从未收录过的新鲜文章
                    unseen_items = filter_unseen_articles(raw_items)
                    if unseen_items:
                        selected_items = unseen_items[:2]  # 精选前2条纯新鲜条目
                        cat = s.get("category", "综合技术")
                        if cat not in results:
                            results[cat] = []
                        results[cat].append({"source": s["name"], "items": selected_items})
                    else:
                        print(f"  [Skip] 数据源【{s['name']}】近期无新发布，已安全跳过历史旧闻。")
            except Exception as e:
                print(f"[Error] Source {s['name']} worker failed: {e}")

    # 生成专业精炼 Markdown
    md = [
        "---",
        f"title: {today_str} 专属全栈工程内参与产品技术速递",
        f"date: {today_str}",
        "tags:",
        "  - tech-news",
        "  - engineering-bulletin",
        "  - github-trending",
        "  - architecture",
        "  - ai-agent",
        "  - daily-digest",
        "---",
        "",
        f"# ⚡ {today_str} ({weekday_str}) 全栈全领域前沿工程内参 (全中文)",
        "",
        "> 🧭 **多维视野**: 纯增量跟踪 **GitHub 爆款开源**、**顶尖大模型前沿 (OpenAI / Anthropic)**、**AI Agent 协议 (MCP)**、**GraphRAG (Neo4j)**、**底层架构 (美团/Cloudflare/Linux)** 官方一手最新发布。",
        "",
        "---",
        ""
    ]

    # 1. 优先展示 GitHub Trending 爆款榜单 (短标题、指标下移加粗)
    if trending_repos:
        md.extend([
            "## 🔥 GitHub 今日爆款开源热榜",
            ""
        ])
        for repo_item in trending_repos:
            r_name = repo_item["repo"]
            r_url = repo_item["url"]
            r_lang = repo_item["lang"]
            r_stars = repo_item["stars_today"]
            r_title = repo_item["title_zh"]
            r_why = repo_item["why_trending"]
            r_takeaway = repo_item["architect_takeaway"]

            md.extend([
                f"### [{r_name}]({r_url}) ({r_title})",
                f"- **今日新增 Star**: `+{r_stars}` | **主要语言**: `{r_lang}` | **开源仓库**: `[{r_name}]({r_url})`",
                f"- **核心看点**: {r_why}",
                f"- **架构启示**: {r_takeaway}",
                ""
            ])
        md.append("---")
        md.append("")

    # 2. 依次展示各技术分类矩阵 (精简短标题与短评)
    preferred_order = [
        "大模型与顶尖前沿",
        "Anthropic 与 Claude 架构",
        "AI Agent",
        "GraphRAG 与智能体记忆",
        "AI微调与工程",
        "硅谷极客热议",
        "国内大厂架构",
        "现代全栈",
        "后端与高并发",
        "操作系统与内核",
        "顶级产品思维",
        "体验设计"
    ]

    sorted_categories = sorted(results.keys(), key=lambda c: preferred_order.index(c) if c in preferred_order else 99)

    for category in sorted_categories:
        source_list = results[category]
        md.append(f"## 📌 {category}")
        md.append("")
        for src in source_list:
            md.append(f"### 🌐 {src['source']}")
            for item in src["items"]:
                t_en = item.get("title", "").strip()
                if not t_en:
                    continue
                d_en = item.get("desc", "").strip()
                url = item.get("url", "")

                # 调用 AI 进行短标题润色与架构师短评
                ai_item = polish_news_item(t_en, d_en[:800], src["source"])
                t_zh = ai_item.get("title_zh") or translate_to_zh(t_en)
                d_zh = ai_item.get("summary_zh") or (translate_to_zh(d_en) if d_en else "官方最新技术演进发布")
                insight = ai_item.get("architect_insight")

                md.extend([
                    f"- **[{t_zh}]({url})**",
                    f"  - **核心要点**: {d_zh}",
                ])

                if insight:
                    md.append(f"  - 💡 **架构师短评**: *{insight}*")

                md.append("")
                
                # 记录待入库项
                all_recommended_articles.append({
                    "url": url,
                    "title": t_en,
                    "title_zh": t_zh,
                    "source": src["source"],
                    "category": category,
                    "summary_zh": d_zh,
                    "architect_insight": insight
                })

        md.append("---")
        md.append("")

    # 将今日推荐的文章落库 PostgreSQL
    if all_recommended_articles:
        record_recommended_articles(all_recommended_articles)

    md.append(f"*本期全栈内参由 dorabighead 的 AI Agent 自动化采集、增量排重与深度润色生成于: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

    os.makedirs(OUTPUT_TECH_NEWS_DIR, exist_ok=True)
    target = os.path.join(OUTPUT_TECH_NEWS_DIR, f"{today_str} 专属技术前沿速递.md")
    with open(target, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    return target, all_recommended_articles

if __name__ == "__main__":
    generate_tech_digest()
