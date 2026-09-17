"""
大模型深度解析器 (DeepSeek / OpenAI / Ollama 兼容适配器)
"""
import urllib.request
import json
import ssl
import os
import sys

from config.settings import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL

def call_deepseek(prompt: str, system_prompt: str = None, timeout: int = 60) -> str:
    api_key = DEEPSEEK_API_KEY or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return ""

    url = f"{DEEPSEEK_BASE_URL.rstrip('/')}/chat/completions"
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "TechDigest-AI/1.0"
        }
    )

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[Warning] DeepSeek API 调用异常: {e}")
        return ""

def polish_paper_analysis(title: str, summary: str, repo: str = None) -> dict:
    """
    使用 AI 对单篇前沿论文进行深度研读与专业润色
    要求：中文标题短小精悍(8~16字以内)，核心突破与落地启发精炼直陈。
    """
    system_prompt = (
        "你是一位顶级 AI 科学家和全栈大模型架构师。擅长用通俗、严谨、极其精炼的语言直击论文技术本质。"
        "严格要求：标题必须短小精练（控制在8~16字以内，杜绝长句）；内容只讲核心机制与工程启示，绝不讲套话。"
    )
    user_prompt = f"""
请深入研读并分析以下前沿论文：
【论文标题】：{title}
【开源仓库】：{repo or "暂无独立开源仓库"}
【原始摘要】：{summary}

请以合法 JSON 格式输出分析结果，键名严格为：
{{
  "title_zh": "极精练的技术短标题（8~16字以内，如：GazeVQA：视线隐式证据融合）",
  "core_breakthrough": "核心突破机制（60-120字，讲透核心创新，段落短小）",
  "engineering_takeaway": "对个人Agent或微调的落地启示（1-2条具体务实建议，每条一行）"
}}
仅输出合法 JSON 纯文本：
"""
    raw_res = call_deepseek(user_prompt, system_prompt=system_prompt, timeout=40)
    if not raw_res:
        return {}
    
    try:
        clean = raw_res.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(clean)
    except Exception:
        return {}

def polish_news_item(title: str, desc: str, source: str) -> dict:
    """
    使用 AI 对一条技术内参新闻进行专业润色与架构视角点评
    要求：标题极短(8~16字)，内容要点控制在2行以内，短评一针见血。
    """
    system_prompt = (
        "你是一位资深全栈架构师。点评风格精炼、务实、一针见血。"
        "严格要求：中文标题必须短小利落（8~16字以内，严禁写成一长句话）。"
    )
    user_prompt = f"""
请分析以下技术资讯/工程发布：
【来源】：{source}
【标题】：{title}
【内容/摘要】：{desc}

请以合法 JSON 格式返回：
{{
  "title_zh": "精炼短标题（8~16字，杜绝长句，如：Claude 推出安全对齐独立审查）",
  "summary_zh": "精炼要点（40-80字，直陈解决了什么核心问题或带来了什么新特性）",
  "architect_insight": "架构师一句话短评（对日常选型或开发的务实启发）"
}}
仅输出合法 JSON 纯文本：
"""
    raw_res = call_deepseek(user_prompt, system_prompt=system_prompt, timeout=30)
    if not raw_res:
        return {}
    try:
        clean = raw_res.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(clean)
    except Exception:
        return {}

def polish_github_repo(repo: str, desc: str, lang: str, stars_today: str) -> dict:
    """
    使用 AI 对 GitHub Trending 爆款项目进行架构解析
    要求：中文短标题(8~15字)，直击为什么引爆社区与架构启示。
    """
    system_prompt = (
        "你是一位顶级开源技术雷达专家。擅长洞察爆款项目的架构本质。"
        "严格要求：中文短定位必须在8~15字以内，不要冗长修饰。"
    )
    user_prompt = f"""
请深入剖析以下 GitHub 今日飙升榜开源项目：
【项目名称】：{repo}
【主要语言】：{lang}
【今日新增 Star】：+{stars_today}
【项目原始简介】：{desc or '暂无详细描述'}

请以合法 JSON 格式输出：
{{
  "title_zh": "精炼短中文定位（8~15字以内，如：阿里混合流水线代码审查）",
  "why_trending": "引爆社区的痛点亮点（50-90字，直击痛点）",
  "architect_takeaway": "架构师工程落地启示（1条务实建议）"
}}
仅输出合法 JSON 纯文本：
"""
    raw_res = call_deepseek(user_prompt, system_prompt=system_prompt, timeout=30)
    if not raw_res:
        return {}
    try:
        clean = raw_res.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(clean)
    except Exception:
        return {}


