"""
计算机与产品殿堂级经典好书精选智库 (Curated CS & Product Classic Books)
收录豆瓣 8.8+ 分神作，按月度精选多本深度拆解合辑
"""
import datetime
import os
from config.settings import OUTPUT_BOOKS_DIR

BOOK_LIBRARY = [
    {
        "title": "深入理解计算机系统 (CSAPP)",
        "en_title": "Computer Systems: A Programmer's Perspective",
        "authors": "Randal E. Bryant / David R. O'Hallaron",
        "rating": "9.8 / 10 (豆瓣计算机类神作巅峰)",
        "category": "🖥️ 操作系统与系统底层",
        "core_problem": "打通应用层代码与底层硬件（CPU指令、虚拟内存、系统调用、汇编、网络I/O）的黑盒，建立真正的系统级视野。",
        "target_audience": "所有希望告别表面调包、深入理解程序在计算机内部如何运行的软件工程师。",
        "key_chapters": [
            "第2章 信息的表示和处理 (整数浮点底层补码与溢出陷阱)",
            "第3章 程序的机器级表示 (手撕汇编、栈帧布局与缓冲区溢出)",
            "第6章 存储器层次结构 (局部性原理、CPU L1/L2/L3 Cache性能飞跃)",
            "第9章 虚拟内存 (分页机制、页表、内存映射与malloc底层实战)",
            "第10~11章 系统级I/O与网络编程 (epoll前置与网络底层)"
        ],
        "takeaways": "读完本书最大的蜕变是：写任何一行高级语言代码时，脑海中能清晰浮现其编译为机器码并在内存和CPU总线中流动的完整物理过程。",
        "links": "[豆瓣读书详情](https://book.douban.com/subject/26912767/) | [CMU 官方配套实验 (CS 15-213)](https://csapp.cs.cmu.edu/)"
    },
    {
        "title": "设计数据密集型应用 (DDIA)",
        "en_title": "Designing Data-Intensive Applications",
        "authors": "Martin Kleppmann",
        "rating": "9.7 / 10 (分布式系统第一圣经)",
        "category": "⚙️ 分布式系统与高并发架构",
        "core_problem": "系统性拆解高并发、高可用、高扩展场景下，数据存储、复制、分区、事务与一致性的技术权衡。",
        "target_audience": "中高级后端架构师、分布式系统研发、云原生与微服务工程师。",
        "key_chapters": [
            "第3章 存储与检索 (LSM-Tree与B-Tree底层权衡，RocksDB与MySQL对比)",
            "第5章 复制 (主从同步、多主冲突解决、无主节点Quorum机制)",
            "第7章 事务 (ACID真相、隔离级别脏读不可重复读幻读原理)",
            "第8章 分布式系统的麻烦 (不可靠网络、时钟漂移与拜占庭故障)",
            "第9章 一致性与共识 (线性一致性、Paxos与Raft共识算法本质)"
        ],
        "takeaways": "不教任何特定中间件的八股API，而是教你在没有完美架构的前提下，如何根据业务特性在一致性、可用性与性能之间做出最优Trade-off。",
        "links": "[豆瓣读书详情](https://book.douban.com/subject/30329536/) | [GitHub 开源翻译精读项目](https://github.com/Vonng/ddia)"
    },
    {
        "title": "操作系统导论 (OSTEP)",
        "en_title": "Operating Systems: Three Easy Pieces",
        "authors": "Remzi H. Arpaci-Dusseau / Andrea C. Arpaci-Dusseau",
        "rating": "9.6 / 10 (最通俗易懂的OS神作)",
        "category": "🖥️ 操作系统原理",
        "core_problem": "围绕“虚拟化 (Virtualization)”、“并发 (Concurrency)”与“持久化 (Persistence)”三大支柱，彻底讲透操作系统内核设计。",
        "target_audience": "想从原理层搞懂进程调度、线程同步、锁机制与文件系统的开发者。",
        "key_chapters": [
            "虚拟化篇：CPU调度算法与分页/分段内存隔离机制",
            "并发篇：条件变量、信号量、死锁预防与无锁编程基础",
            "持久化篇：硬磁盘与SSD底层、文件系统崩溃恢复日志 (FSCK & Journaling)"
        ],
        "takeaways": "文笔风趣幽默，每一个核心机制均配有简单小巧的C语言实验模拟，是进阶Linux内核开发最平滑的桥梁。",
        "links": "[官方免费开源英文版全书](https://pages.cs.wisc.edu/~remzi/OSTEP/) | [豆瓣读书详情](https://book.douban.com/subject/33463930/)"
    },
    {
        "title": "设计心理学 1：日常的设计",
        "en_title": "The Design of Everyday Things",
        "authors": "Don Norman (唐·诺曼)",
        "rating": "9.1 / 10 (体验设计与产品交互圣经)",
        "category": "🎨 体验设计与产品交互",
        "core_problem": "为什么门会推错、APP按钮会让用户困惑？深入剖析人脑认知模式与人机交互界面的心理学规律。",
        "target_audience": "前端工程师、UI/UX 设计师、独立开发者与产品经理。",
        "key_chapters": [
            "示能 (Affordance) 与意符 (Signifiers)：界面如何直观告诉用户它能做什么",
            "概念模型与心智模型：用户脑海中的运行方式与系统的实际运行方式如何对其",
            "容错机制与防错设计：如何从根本上预防用户的误操作与挫败感"
        ],
        "takeaways": "优秀的工程绝不是自嗨的算法复杂度，而是让用户在使用产品时感受不到技术的存在，极其自然顺畅地达成目标。",
        "links": "[豆瓣读书详情](https://book.douban.com/subject/25974005/)"
    },
    {
        "title": "SRE：Google 运维解密",
        "en_title": "Site Reliability Engineering: How Google Runs Production Systems",
        "authors": "Betsy Beyer / Chris Jones / Jennifer Petoff / Niall Richard Murphy",
        "rating": "9.4 / 10 (现代云原生运维行业奠基作)",
        "category": "☁️ 云原生与智能运维",
        "core_problem": "“如果让软件工程师来设计运维，世界会变成怎样？”——彻底颠覆传统人肉运维模式，用软件工程思维重构大规模生产系统稳定性。",
        "target_audience": "DevOps、SRE架构师、技术负责人与高可用系统工程师。",
        "key_chapters": [
            "第3章 拥抱风险与错误预算 (Error Budgets：如何平衡迭代速度与系统可用性)",
            "第4章 服务质量指标 (SLI / SLO / SLA 的科学量化制定)",
            "第5章 消除琐事 (Toil：自动化替代人肉运维的铁律)",
            "第15章 事后总结文化 (Blameless Postmortem：不指责、查根因的工程复盘)"
        ],
        "takeaways": "稳定性不是靠祈祷出来的，而是靠严格的工程度量、自动化止损和不指责的事后复盘制度构建出来的。",
        "links": "[Google 官方免费阅读电子版](https://sre.google/sre-book/table-of-contents/) | [豆瓣读书详情](https://book.douban.com/subject/26875239/)"
    }
]

def generate_daily_book():
    """
    改为月度合辑生成：每月 1 期，每期多本深度经典书单组合
    """
    today = datetime.date.today()
    month_str = today.strftime("%Y-%m")
    
    os.makedirs(OUTPUT_BOOKS_DIR, exist_ok=True)
    target = os.path.join(OUTPUT_BOOKS_DIR, f"{month_str} 计算机高分好书精读推荐.md")
    
    # 若本月合辑已生成，直接返回
    if os.path.exists(target):
        return target

    # 动态轮换：根据月份余数滚动选取 4 本神作组合，避免每月固定前4本
    month_offset = ((today.year - 2026) * 12 + today.month - 1) % len(BOOK_LIBRARY)
    selected_books = [BOOK_LIBRARY[(month_offset + i) % len(BOOK_LIBRARY)] for i in range(min(4, len(BOOK_LIBRARY)))]

    md = [
        "---",
        f"title: {month_str} 计算机与产品殿堂级经典好书精读推荐",
        f"date: {month_str}-01",
        "tags:",
        "  - cs-books",
        "  - reading-notes",
        "  - architecture",
        "  - classic",
        "---",
        "",
        f"# 📚 {month_str} 计算机与产品殿堂级经典好书精读合辑",
        "",
        "> 💡 **本月寄语**：不被日常调包与泛滥碎片信息裹挟，系统化沉淀跨越技术周期的底层认知框架。",
        "",
        "---",
        ""
    ]

    for idx, book in enumerate(selected_books, 1):
        md.extend([
            f"## 📖 模块 {idx}：{book['title']}",
            f"> ⭐ **豆瓣评分**: **{book['rating']}** | 类别: `{book['category']}`",
            f"> ✍️ **作者**: {book['authors']} (原著名: *{book['en_title']}*)",
            "",
            f"### 🎯 为什么必读？",
            f"> {book['core_problem']}",
            f"- **适合人群**: {book['target_audience']}",
            "",
            "### 🗺️ 核心章节思维导图",
            ""
        ])
        for chap in book['key_chapters']:
            md.append(f"- [x] **{chap}**")
        md.extend([
            "",
            "### 💡 核心认知模型沉淀",
            f"> {book['takeaways']}",
            "",
            f"### 🔗 直达链接",
            f"- {book['links']}",
            "",
            "---",
            ""
        ])

    md.append(f"*本月经典好书精读由 dorabighead 的 AI Agent 自动化采集、导读解析与深度润色生成于: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

    with open(target, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    return target
