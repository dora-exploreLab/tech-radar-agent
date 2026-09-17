"""
PostgreSQL 知识数仓与全局去重核心引擎 (PostgreSQL Knowledge Warehouse & Deduplication)
"""
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor, Json
import hashlib
import re
import os
import sys
import glob
import datetime
import logging

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from config.settings import PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DBNAME, VAULT_ROOT

logger = logging.getLogger("PgDatabase")

def get_connection():
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        user=PG_USER,
        password=PG_PASSWORD,
        dbname=PG_DBNAME,
        connect_timeout=10
    )

def init_database():
    """
    初始化数仓表结构与唯一索引
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        # 1. 文章与快讯表
        cur.execute("""
        CREATE TABLE IF NOT EXISTS crawler_articles (
            id SERIAL PRIMARY KEY,
            url TEXT UNIQUE NOT NULL,
            url_hash VARCHAR(64) NOT NULL,
            title TEXT NOT NULL,
            title_zh VARCHAR(256),
            source_name VARCHAR(128) NOT NULL,
            category VARCHAR(64) NOT NULL,
            summary_zh TEXT,
            architect_insight TEXT,
            raw_payload JSONB,
            first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_recommended_at DATE,
            recommend_count INTEGER DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_articles_url ON crawler_articles(url);
        CREATE INDEX IF NOT EXISTS idx_articles_source ON crawler_articles(source_name);
        CREATE INDEX IF NOT EXISTS idx_articles_last_rec ON crawler_articles(last_recommended_at);
        """)

        # 2. 学术论文表
        cur.execute("""
        CREATE TABLE IF NOT EXISTS crawler_papers (
            id SERIAL PRIMARY KEY,
            arxiv_id VARCHAR(128) UNIQUE NOT NULL,
            title TEXT NOT NULL,
            title_zh VARCHAR(256),
            authors TEXT,
            organization VARCHAR(128),
            github_repo TEXT,
            github_stars INTEGER DEFAULT 0,
            upvotes INTEGER DEFAULT 0,
            core_breakthrough TEXT,
            engineering_takeaway TEXT,
            raw_payload JSONB,
            first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_recommended_at DATE,
            recommend_count INTEGER DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_papers_arxiv_id ON crawler_papers(arxiv_id);
        CREATE INDEX IF NOT EXISTS idx_papers_last_rec ON crawler_papers(last_recommended_at);
        """)

        # 3. 开源热榜表
        cur.execute("""
        CREATE TABLE IF NOT EXISTS crawler_github_repos (
            id SERIAL PRIMARY KEY,
            repo_name VARCHAR(256) NOT NULL,
            repo_url TEXT NOT NULL,
            language VARCHAR(64),
            stars_today INTEGER DEFAULT 0,
            title_zh VARCHAR(256),
            why_trending TEXT,
            architect_takeaway TEXT,
            date_recorded DATE NOT NULL,
            UNIQUE(repo_name, date_recorded)
        );
        CREATE INDEX IF NOT EXISTS idx_repos_name ON crawler_github_repos(repo_name);
        CREATE INDEX IF NOT EXISTS idx_repos_date ON crawler_github_repos(date_recorded);
        """)

        # 4. 每日运行流水与幂等锁表
        cur.execute("""
        CREATE TABLE IF NOT EXISTS crawler_daily_runs (
            run_date DATE PRIMARY KEY,
            status VARCHAR(32) NOT NULL,
            tech_news_file TEXT,
            papers_file TEXT,
            books_file TEXT,
            column_article_file TEXT,
            column_article_slug VARCHAR(128),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """)

        conn.commit()
        logger.info("PostgreSQL 数仓表结构与唯一索引初始化成功！")
    except Exception as e:
        conn.rollback()
        logger.error(f"初始化数据库表失败: {e}", exc_info=True)
        raise
    finally:
        cur.close()
        conn.close()

# ==========================================
# 技术快讯与大厂博客去重
# ==========================================
def filter_unseen_articles(items, key="url"):
    """
    接收候选文章列表，比对数据库，返回从未收录过的新鲜文章列表
    """
    if not items:
        return []
    
    urls = [it.get(key, "").strip() for it in items if it.get(key)]
    if not urls:
        return items

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT url FROM crawler_articles WHERE url = ANY(%s)",
            (urls,)
        )
        seen_urls = set(row[0] for row in cur.fetchall())
        unseen = [it for it in items if it.get(key, "").strip() not in seen_urls]
        return unseen
    except Exception as e:
        logger.error(f"查询文章去重失败: {e}")
        return items
    finally:
        cur.close()
        conn.close()

def record_recommended_articles(items, rec_date=None):
    """
    将今日选中的文章持久化落库
    """
    if not items:
        return
    if rec_date is None:
        rec_date = datetime.date.today()

    conn = get_connection()
    cur = conn.cursor()
    try:
        query = """
        INSERT INTO crawler_articles 
            (url, url_hash, title, title_zh, source_name, category, summary_zh, architect_insight, raw_payload, last_recommended_at, recommend_count)
        VALUES 
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        ON CONFLICT (url) DO UPDATE SET
            last_recommended_at = EXCLUDED.last_recommended_at,
            recommend_count = crawler_articles.recommend_count + 1,
            title_zh = COALESCE(EXCLUDED.title_zh, crawler_articles.title_zh),
            summary_zh = COALESCE(EXCLUDED.summary_zh, crawler_articles.summary_zh),
            architect_insight = COALESCE(EXCLUDED.architect_insight, crawler_articles.architect_insight);
        """
        for it in items:
            url = it.get("url", "").strip()
            if not url:
                continue
            url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()
            title = it.get("title", "")
            title_zh = it.get("title_zh")
            source = it.get("source", "未知数据源")
            cat = it.get("category", "综合技术")
            summary_zh = it.get("summary_zh") or it.get("desc")
            insight = it.get("architect_insight")
            cur.execute(query, (url, url_hash, title, title_zh, source, cat, summary_zh, insight, Json(it), rec_date))

        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"写入精选文章失败: {e}")
    finally:
        cur.close()
        conn.close()

# ==========================================
# 学术论文去重与 14 天冷却期
# ==========================================
def filter_unseen_papers(papers_list, cooldown_days=14):
    """
    过滤掉 14 天内推荐过的论文，保证精选出的论文 100% 具备新鲜感
    """
    if not papers_list:
        return []

    p_ids = []
    for item in papers_list:
        p = item.get("paper", item)
        pid = p.get("id") or p.get("arxiv_id") or p.get("title")
        if pid:
            p_ids.append(str(pid).strip())

    if not p_ids:
        return papers_list

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT arxiv_id FROM crawler_papers 
            WHERE arxiv_id = ANY(%s) 
              AND last_recommended_at >= CURRENT_DATE - %s::INTEGER
        """, (p_ids, cooldown_days))
        cooldown_ids = set(row[0] for row in cur.fetchall())

        unseen = []
        for item in papers_list:
            p = item.get("paper", item)
            pid = str(p.get("id") or p.get("arxiv_id") or p.get("title")).strip()
            if pid not in cooldown_ids:
                unseen.append(item)
        return unseen
    except Exception as e:
        logger.error(f"过滤冷却期论文失败: {e}")
        return papers_list
    finally:
        cur.close()
        conn.close()

def record_recommended_papers(papers, rec_date=None):
    if not papers:
        return
    if rec_date is None:
        rec_date = datetime.date.today()

    conn = get_connection()
    cur = conn.cursor()
    try:
        query = """
        INSERT INTO crawler_papers 
            (arxiv_id, title, title_zh, authors, organization, github_repo, github_stars, upvotes, core_breakthrough, engineering_takeaway, raw_payload, last_recommended_at, recommend_count)
        VALUES 
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        ON CONFLICT (arxiv_id) DO UPDATE SET
            last_recommended_at = EXCLUDED.last_recommended_at,
            upvotes = EXCLUDED.upvotes,
            github_stars = EXCLUDED.github_stars,
            recommend_count = crawler_papers.recommend_count + 1,
            title_zh = COALESCE(EXCLUDED.title_zh, crawler_papers.title_zh),
            core_breakthrough = COALESCE(EXCLUDED.core_breakthrough, crawler_papers.core_breakthrough),
            engineering_takeaway = COALESCE(EXCLUDED.engineering_takeaway, crawler_papers.engineering_takeaway);
        """
        for p in papers:
            paper_obj = p.get("paper", p)
            pid = str(paper_obj.get("id") or paper_obj.get("arxiv_id") or paper_obj.get("title")).strip()
            title = paper_obj.get("title", "")
            title_zh = p.get("title_zh") or paper_obj.get("title_zh")
            authors = p.get("authors") or str(paper_obj.get("authors", ""))
            org = p.get("organization") or str(paper_obj.get("organization", ""))
            repo = paper_obj.get("githubRepo") or p.get("github_repo")
            stars = int(paper_obj.get("githubStars") or 0)
            upvotes = int(paper_obj.get("upvotes") or 0)
            breakthrough = p.get("core_breakthrough")
            takeaway = p.get("engineering_takeaway")
            cur.execute(query, (pid, title, title_zh, str(authors), str(org), repo, stars, upvotes, breakthrough, takeaway, Json(paper_obj), rec_date))

        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"写入精选论文失败: {e}")
    finally:
        cur.close()
        conn.close()

# ==========================================
# 开源项目去重与霸榜过滤
# ==========================================
def filter_unseen_repos(repos, days=7):
    """
    过滤过去 7 天连续上榜的 repo，优先呈现新晋黑马
    """
    if not repos:
        return []
    repo_names = [r.get("repo") for r in repos if r.get("repo")]
    if not repo_names:
        return repos

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT DISTINCT repo_name FROM crawler_github_repos
            WHERE repo_name = ANY(%s)
              AND date_recorded >= CURRENT_DATE - %s::INTEGER
        """, (repo_names, days))
        seen = set(row[0] for row in cur.fetchall())
        unseen = [r for r in repos if r.get("repo") not in seen]
        # 若全被过滤，至少保留前 3 个
        return unseen if len(unseen) >= 2 else repos[:3]
    except Exception as e:
        logger.error(f"过滤近期已推仓库失败: {e}")
        return repos
    finally:
        cur.close()
        conn.close()

def record_trending_repos(repos, rec_date=None):
    if not repos:
        return
    if rec_date is None:
        rec_date = datetime.date.today()

    conn = get_connection()
    cur = conn.cursor()
    try:
        query = """
        INSERT INTO crawler_github_repos
            (repo_name, repo_url, language, stars_today, title_zh, why_trending, architect_takeaway, date_recorded)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (repo_name, date_recorded) DO NOTHING;
        """
        for r in repos:
            repo_name = r.get("repo", "")
            repo_url = r.get("url", f"https://github.com/{repo_name}")
            lang = r.get("lang", "")
            stars = int(str(r.get("stars_today", "0")).replace(",", "") or 0)
            title_zh = r.get("title_zh")
            why = r.get("why_trending")
            takeaway = r.get("architect_takeaway")
            cur.execute(query, (repo_name, repo_url, lang, stars, title_zh, why, takeaway, rec_date))
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"写入开源项目热榜失败: {e}")
    finally:
        cur.close()
        conn.close()

# ==========================================
# 每日流水与单日幂等锁
# ==========================================
def get_daily_run(date_str):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM crawler_daily_runs WHERE run_date = %s", (date_str,))
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()

def record_daily_run(date_str, status, **kwargs):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO crawler_daily_runs (run_date, status, tech_news_file, papers_file, books_file, column_article_file, column_article_slug, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (run_date) DO UPDATE SET
                status = EXCLUDED.status,
                tech_news_file = COALESCE(EXCLUDED.tech_news_file, crawler_daily_runs.tech_news_file),
                papers_file = COALESCE(EXCLUDED.papers_file, crawler_daily_runs.papers_file),
                books_file = COALESCE(EXCLUDED.books_file, crawler_daily_runs.books_file),
                column_article_file = COALESCE(EXCLUDED.column_article_file, crawler_daily_runs.column_article_file),
                column_article_slug = COALESCE(EXCLUDED.column_article_slug, crawler_daily_runs.column_article_slug),
                updated_at = CURRENT_TIMESTAMP;
        """, (
            date_str,
            status,
            kwargs.get("tech_news_file"),
            kwargs.get("papers_file"),
            kwargs.get("books_file"),
            kwargs.get("column_article_file"),
            kwargs.get("column_article_slug")
        ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"记录每日运行状态失败: {e}")
    finally:
        cur.close()
        conn.close()

# ==========================================
# 冷启动自动回填 (Backfill from Obsidian Vault)
# ==========================================
def backfill_from_vault():
    """
    扫描知识库已有的历史笔记，将所有历史 URL 与论文 ID 提前注入数据库，让数仓启动即有记忆
    """
    init_database()
    logger.info(">> 开始执行历史笔记冷启动回填 (Backfill)...")

    tech_dir = os.environ.get("TECH_NEWS_DIR", os.path.join(VAULT_ROOT, "news"))
    paper_dir = os.environ.get("PAPERS_DIR", os.path.join(VAULT_ROOT, "papers"))

    conn = get_connection()
    cur = conn.cursor()

    article_count = 0
    paper_count = 0

    # 1. 扫描历史技术快讯
    if os.path.exists(tech_dir):
        for md_path in glob.glob(os.path.join(tech_dir, "*.md")):
            try:
                fname = os.path.basename(md_path)
                date_match = re.search(r"(\d{4}-\d{2}-\d{2})", fname)
                rec_date = date_match.group(1) if date_match else "2026-09-01"
                
                with open(md_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                # 提取链接格式: - **[标题](url)**
                links = re.findall(r"-\s+\*\*\[(.*?)\]\((https?://[^\)]+)\)\*\*", content)
                for title, url in links:
                    url = url.strip()
                    if not url or "huggingface.co" in url or "arxiv.org" in url:
                        continue
                    url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()
                    cur.execute("""
                        INSERT INTO crawler_articles 
                            (url, url_hash, title, title_zh, source_name, category, last_recommended_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (url) DO NOTHING;
                    """, (url, url_hash, title, title, "历史导入", "综合技术", rec_date))
                    article_count += 1
            except Exception as e:
                logger.warning(f"扫描快讯文件 {md_path} 失败: {e}")

    # 2. 扫描历史论文精选
    if os.path.exists(paper_dir):
        for md_path in glob.glob(os.path.join(paper_dir, "*.md")):
            try:
                fname = os.path.basename(md_path)
                date_match = re.search(r"(\d{4}-\d{2}-\d{2})", fname)
                rec_date = date_match.group(1) if date_match else "2026-09-01"

                with open(md_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                # 提取 arXiv ID 或链接
                arxiv_links = re.findall(r"arxiv\.org/abs/([0-9\.]+)", content)
                for aid in set(arxiv_links):
                    cur.execute("""
                        INSERT INTO crawler_papers (arxiv_id, title, title_zh, last_recommended_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (arxiv_id) DO NOTHING;
                    """, (aid, f"arXiv:{aid}", f"arXiv:{aid}", rec_date))
                    paper_count += 1
            except Exception as e:
                logger.warning(f"扫描论文文件 {md_path} 失败: {e}")

    conn.commit()
    cur.close()
    conn.close()
    logger.info(f"✅ 历史笔记冷启动回填完成！共处理历史文章记录 {article_count} 条，历史论文记录 {paper_count} 条。")
    return article_count, paper_count

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    backfill_from_vault()
