"""
智能网络分流客户端 (Smart Network Dispatcher)
严格遵循：
  - 国内网站绝对直连 (Direct Connection)，防止 WAF 拦截与节点绕路
  - 国外网站自适应走本地宿主机 Clash 代理 (7897端口隧道)
"""
import urllib.request
import ssl
import socket
import os
import sys

from config.settings import (
    IS_WSL, CLASH_PORT, CLASH_HOST_WINDOWS, CLASH_HOST_WSL, 
    CLASH_AUTH, REQUEST_TIMEOUT, DOMESTIC_KEYWORDS
)

class SmartNetworkClient:
    def __init__(self):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        # 1. 国内直连通道 (Direct Opener)
        self.direct_opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}),
            urllib.request.HTTPSHandler(context=ctx)
        )

        # 2. 国外代理通道 (Proxy Opener)
        # 判断运行环境并拼接代理地址
        if IS_WSL:
            proxy_url = f"http://{CLASH_AUTH}@{CLASH_HOST_WSL}:{CLASH_PORT}"
        else:
            proxy_url = f"http://{CLASH_HOST_WINDOWS}:{CLASH_PORT}"

        self.proxy_opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({
                "http": proxy_url,
                "https": proxy_url
            }),
            urllib.request.HTTPSHandler(context=ctx)
        )

    def is_domestic(self, url: str) -> bool:
        url_lower = url.lower()
        return any(kw in url_lower for kw in DOMESTIC_KEYWORDS)

    def fetch(self, url: str, headers: dict = None, timeout: int = REQUEST_TIMEOUT) -> bytes:
        default_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8"
        }
        if headers:
            default_headers.update(headers)

        req = urllib.request.Request(url, headers=default_headers)

        # 智能分流
        if self.is_domestic(url):
            opener = self.direct_opener
            mode = "Direct (国内直连)"
        else:
            opener = self.proxy_opener
            mode = "Clash Proxy (国外代理)"

        try:
            with opener.open(req, timeout=timeout) as resp:
                data = resp.read()
                return data
        except Exception as e:
            # 若代理异常，国外源尝试一次直连回退
            if not self.is_domestic(url):
                try:
                    with self.direct_opener.open(req, timeout=timeout) as resp:
                        return resp.read()
                except Exception:
                    pass
            raise e

# 全局单例
client = SmartNetworkClient()
