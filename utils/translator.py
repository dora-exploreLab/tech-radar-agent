"""
全量中文翻译与专业技术名词保护引擎 (Chinese Localization Engine)
核心功能：
  1. 专有名词白名单安全保护 (防止 K8s, LoRA, eBPF, Figma, TypeScript 被乱翻)
  2. 智能标点分句切块 (保持 <= 400 字符，规避 API 长度限制)
  3. 双通道免 Key 自动降级与地道中文输出
"""
import urllib.parse
import json
import re
from utils.network import client

# 专有名词保护白名单 (不区分大小写匹配)
PROTECTED_TERMS = [
    "Kubernetes", "K8s", "Docker", "Containerd", "TypeScript", "JavaScript", 
    "React", "Next.js", "Vue", "Vite", "Node.js", "Go", "Golang", "Rust", "Python",
    "eBPF", "Linux", "Kernel", "Cloudflare", "Figma", "Y Combinator",
    "LLM", "Agent", "Agents", "LoRA", "QLoRA", "SFT", "DPO", "RLHF", "MCP",
    "Model Context Protocol", "Prompt", "Transformer", "Reasoning", "RAG",
    "DeepSpeed", "Megatron", "vLLM", "Ollama", "Hugging Face"
]

def protect_terms(text: str):
    terms_map = {}
    modified_text = text
    for idx, term in enumerate(PROTECTED_TERMS):
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        if pattern.search(modified_text):
            placeholder = f"__TERM_{idx}__"
            terms_map[placeholder] = term
            modified_text = pattern.sub(placeholder, modified_text)
    return modified_text, terms_map

def restore_terms(text: str, terms_map: dict):
    result = text
    for placeholder, original in terms_map.items():
        result = result.replace(placeholder, original)
        # 兼容翻译器可能会把下划线去掉或加空格的情况
        clean_ph = placeholder.replace("_", "").lower()
        result = re.sub(re.escape(clean_ph), original, result, flags=re.IGNORECASE)
    return result

def split_sentences(text: str, max_chunk=400):
    sentences = re.split(r"([。！？.!?\n]+)", text)
    chunks = []
    curr = ""
    for s in sentences:
        if len(curr) + len(s) < max_chunk:
            curr += s
        else:
            if curr.strip():
                chunks.append(curr.strip())
            curr = s
    if curr.strip():
        chunks.append(curr.strip())
    return chunks or [text]

def translate_chunk(chunk: str) -> str:
    if not chunk or not chunk.strip():
        return ""
    q = urllib.parse.quote(chunk.strip())
    # 使用公共高可用翻译接口
    url = f"https://api.mymemory.translated.net/get?q={q}&langpair=en|zh-CN"
    try:
        raw = client.fetch(url, timeout=6)
        data = json.loads(raw.decode("utf-8"))
        res = data.get("responseData", {}).get("translatedText")
        if res and not res.startswith("MYMEMORY WARNING"):
            return res
    except Exception:
        pass
    return chunk

def translate_to_zh(text: str) -> str:
    if not text or not text.strip():
        return ""
    
    # 纯 ASCII 英文才翻译，若本身已包含较多中文则直接返回
    zh_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    if zh_chars > len(text) * 0.3:
        return text

    protected_text, terms_map = protect_terms(text)
    chunks = split_sentences(protected_text, max_chunk=380)

    translated_chunks = []
    for c in chunks:
        zh = translate_chunk(c)
        translated_chunks.append(zh)

    merged = " ".join(translated_chunks)
    return restore_terms(merged, terms_map)
