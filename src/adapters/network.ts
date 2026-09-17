import axios, { type AxiosRequestConfig } from "axios";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { consola } from "consola";
import type { AppConfig } from "../config/index.js";
import type { FetchOptions } from "../core/types.js";

// ==============================================================================
// 智能网络分流与多协议抓取适配器 (Smart Routing Network Adapter)
// ==============================================================================
export class NetworkAdapter {
  private httpAgent?: any;
  private httpsAgent?: any;

  constructor(private config: AppConfig["network"]) {
    this.initProxyAgents();
  }

  private initProxyAgents(): void {
    if (!this.config.proxyUrl || this.config.proxyMode === "never") {
      return;
    }

    try {
      const proxyUrl = new URL(this.config.proxyUrl);
      if (this.config.proxyAuth && !proxyUrl.username) {
        const [u, p] = this.config.proxyAuth.split(":");
        proxyUrl.username = u;
        proxyUrl.password = p;
      }

      if (proxyUrl.protocol.startsWith("socks")) {
        const agent = new SocksProxyAgent(proxyUrl.toString());
        this.httpAgent = agent;
        this.httpsAgent = agent;
      } else {
        this.httpAgent = new HttpProxyAgent({
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 256,
          maxFreeSockets: 256,
          proxy: proxyUrl.toString(),
        });
        this.httpsAgent = new HttpsProxyAgent({
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 256,
          maxFreeSockets: 256,
          proxy: proxyUrl.toString(),
        });
      }
    } catch (err) {
      consola.warn("⚠️ 初始化代理 Agent 失败，将降级为直连:", err);
    }
  }

  /**
   * 判断目标 URL 是否属于国内直连范围 (智能分流白名单)
   */
  isDomesticUrl(urlStr: string): boolean {
    try {
      const host = new URL(urlStr).hostname.toLowerCase();
      return this.config.domesticDomains.some((keyword) => {
        if (keyword.startsWith(".")) {
          return host.endsWith(keyword);
        }
        return host === keyword || host.endsWith(`.${keyword}`);
      });
    } catch {
      return false;
    }
  }

  /**
   * 执行 HTTP GET 抓取，智能挂载代理或直连
   */
  async fetch(url: string, options?: FetchOptions): Promise<string> {
    const isDomestic =
      options?.isDomestic ?? (this.config.proxyMode === "auto" ? this.isDomesticUrl(url) : false);

    const useProxy =
      this.config.proxyMode === "always" ||
      (this.config.proxyMode === "auto" && !isDomestic && !!this.httpAgent);

    const axiosConfig: AxiosRequestConfig = {
      url,
      method: "GET",
      timeout: options?.timeoutMs || this.config.timeoutMs,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        ...options?.headers,
      },
      responseType: options?.responseType === "json" ? "json" : "text",
    };

    if (useProxy) {
      axiosConfig.httpAgent = this.httpAgent;
      axiosConfig.httpsAgent = this.httpsAgent;
      axiosConfig.proxy = false; // 由 hpagent/socks-proxy-agent 托管
    } else {
      axiosConfig.proxy = false;
    }

    try {
      const res = await axios(axiosConfig);
      return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    } catch (err: any) {
      const routeInfo = useProxy ? `[代理: ${this.config.proxyUrl}]` : `[直连]`;
      throw new Error(`网络请求失败 ${routeInfo} (${url}): ${err.message || err}`);
    }
  }

  /**
   * 专用的 JSON 抓取快捷方法
   */
  async fetchJson<T = any>(url: string, options?: FetchOptions): Promise<T> {
    const raw = await this.fetch(url, { ...options, responseType: "json" });
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return raw as any;
    }
  }
}
