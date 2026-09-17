// ==============================================================================
// 🎨 模块化排版引擎与模版配置中心 (Typography Configuration & Themes)
// ==============================================================================

export interface TypographyConfig {
  dailyTitleTemplate: string;
  majorHeadingStyle: "chinese-numeral" | "decimal" | "emoji";
  subItemStyle: "hierarchical" | "bullet" | "plain";
  insightLabel: string;
  highlightsLabel: string;
  metricsPlacement: "independent-bold" | "inline" | "badge";
  forbiddenWords: string[];
}

export const TYPOGRAPHY_PRESETS: Record<string, TypographyConfig> = {
  geek: {
    dailyTitleTemplate: "# ⚡ {date} ({weekday}) 全栈技术前沿快讯 (高信噪比精选)",
    majorHeadingStyle: "chinese-numeral", // ## 一、
    subItemStyle: "hierarchical", // ### 1.1
    insightLabel: "💡 工程借鉴",
    highlightsLabel: "🎯 核心看点",
    metricsPlacement: "independent-bold", // **指标**: 值
    forbiddenWords: ["内参", "架构启示"],
  },
  standard: {
    dailyTitleTemplate: "# 📰 {date} ({weekday}) 全栈技术速递",
    majorHeadingStyle: "decimal", // ## 1.
    subItemStyle: "hierarchical",
    insightLabel: "💡 工程思考",
    highlightsLabel: "📌 核心摘要",
    metricsPlacement: "independent-bold",
    forbiddenWords: ["内参"],
  },
  academic: {
    dailyTitleTemplate: "# 📚 {date} 技术与学术快报",
    majorHeadingStyle: "chinese-numeral",
    subItemStyle: "plain",
    insightLabel: "🔬 启迪与展望",
    highlightsLabel: "📖 研究摘要",
    metricsPlacement: "inline",
    forbiddenWords: ["内参"],
  },
};

const CHINESE_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export class TypographyFormatter {
  constructor(private config: TypographyConfig) {}

  formatDailyTitle(date: string, weekday: string, titleSuffix: string = "全栈技术前沿快讯"): string {
    return this.config.dailyTitleTemplate
      .replace("{date}", date)
      .replace("{weekday}", weekday)
      .replace("{title}", titleSuffix);
  }

  getMajorHeading(index: number, title: string): string {
    let prefix = "";
    if (this.config.majorHeadingStyle === "chinese-numeral") {
      const numeral = CHINESE_NUMERALS[index - 1] || `${index}`;
      prefix = `${numeral}、`;
    } else if (this.config.majorHeadingStyle === "decimal") {
      prefix = `${index}. `;
    } else {
      prefix = `🚀 `;
    }
    return `## ${prefix}${this.sanitize(title)}`;
  }

  getSubItemHeading(
    majorIndex: number,
    subIndex: number,
    titleZh: string,
    rawName?: string,
    url?: string
  ): string {
    const cleanZh = this.sanitize(titleZh).trim();
    let numPrefix = "";
    if (this.config.subItemStyle === "hierarchical") {
      numPrefix = `${majorIndex}.${subIndex} `;
    }

    if (rawName && url) {
      return `### ${numPrefix}${cleanZh} ([${rawName}](${url}))`;
    }
    return `### ${numPrefix}${cleanZh}`;
  }

  formatMetrics(metrics: Array<{ label: string; value: string; url?: string }>): string {
    const parts = metrics.map((m) => {
      const val = m.url ? `[${m.value}](${m.url})` : m.value;
      return `**${m.label}**: ${val}`;
    });
    return parts.join(" | ");
  }

  getInsightHeader(): string {
    return `**${this.config.insightLabel}**:`;
  }

  getHighlightsHeader(): string {
    return `**${this.config.highlightsLabel}**:`;
  }

  sanitize(text: string): string {
    let result = text;
    for (const forbidden of this.config.forbiddenWords) {
      if (forbidden === "内参") {
        result = result.replace(/内参/g, "前沿快讯");
      } else if (forbidden === "架构启示") {
        result = result.replace(/架构启示/g, this.config.insightLabel);
      } else {
        result = result.split(forbidden).join("");
      }
    }
    return result;
  }
}
