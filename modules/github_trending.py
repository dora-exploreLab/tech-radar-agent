"""
GitHub Trending 今日飙升榜抓取与 AI 架构解析引擎
负责：抓取每日全网 Star 增速最快的前沿开源项目，提炼痛点与架构价值
"""
import re
import os
import sys
import logging

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from utils.network import client
from utils.ai_analyzer import polish_github_repo
from utils.pg_db import filter_unseen_repos, record_trending_repos

logger = logging.getLogger('GitHubTrending')

def fetch_github_trending(limit=5):
    url = 'https://github.com/trending'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    }
    raw_candidates = []
    try:
        raw_html = client.fetch(url, headers=headers, timeout=15).decode('utf-8', errors='ignore')
        articles = re.findall(r'<article class="Box-row"[^>]*>(.*?)</article>', raw_html, re.DOTALL)
        
        for art in articles[:12]:  # 扩大候选池至前12名
            repo_match = re.search(r'<h2[^>]*>\s*<a[^>]*href="/([^"]+)"', art)
            repo = repo_match.group(1).strip() if repo_match else 'unknown'
            if repo == 'unknown':
                continue

            desc_match = re.search(r'<p[^>]*class="[^"]*col-9[^"]*"[^>]*>(.*?)</p>', art, re.DOTALL)
            desc = ''
            if desc_match:
                desc = re.sub(r'<.*?>', '', desc_match.group(1)).strip()

            stars_today_match = re.search(r'([0-9,]+)\s+stars\s+today', art)
            stars_today = stars_today_match.group(1).replace(',', '') if stars_today_match else ''

            lang_match = re.search(r'itemprop="programmingLanguage">([^<]+)<', art)
            lang = lang_match.group(1).strip() if lang_match else 'General'

            raw_candidates.append({
                'repo': repo,
                'url': f'https://github.com/{repo}',
                'desc': desc,
                'lang': lang,
                'stars_today': stars_today
            })

        # 过滤近 7 天连续已推的霸榜项目，优先呈现新晋黑马
        filtered_candidates = filter_unseen_repos(raw_candidates, days=7)[:limit]

        trending_items = []
        for item in filtered_candidates:
            repo = item['repo']
            desc = item['desc']
            lang = item['lang']
            stars_today = item['stars_today']

            # 调用 AI 进行深度研读解析
            ai_data = polish_github_repo(repo, desc, lang, stars_today)
            title_zh = ai_data.get('title_zh') or f'{repo} 开源架构创新'
            why_trending = ai_data.get('why_trending') or (desc if desc else '社区高度关注的创新开源实现')
            takeaway = ai_data.get('architect_takeaway') or '值得深入研读其架构模式并借鉴到自身工程'

            trending_items.append({
                'repo': repo,
                'url': item['url'],
                'desc': desc,
                'lang': lang,
                'stars_today': stars_today,
                'title_zh': title_zh,
                'why_trending': why_trending,
                'architect_takeaway': takeaway
            })

        # 记录今日推荐入库
        record_trending_repos(trending_items)
        return trending_items
    except Exception as e:
        logger.error(f'拉取 GitHub Trending 失败: {e}')
        return []

if __name__ == '__main__':
    items = fetch_github_trending(3)
    for it in items:
        print(it)
