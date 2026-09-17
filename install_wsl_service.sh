#!/bin/bash
# 一键安装 systemd 用户定时服务 (WSL Debian)

set -e

SERVICE_DIR="$HOME/.config/systemd/user"
mkdir -p "$SERVICE_DIR"

echo ">> 正在生成 systemd 服务配置文件..."

cat << 'EOF' > "$SERVICE_DIR/daily-digest.service"
[Unit]
Description=Daily Curated Tech, Paper and CS Book Digest Service
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/mnt/d/Project/CrawlerProject
ExecStart=/usr/bin/python3 /mnt/d/Project/CrawlerProject/run_daily_digest.py
StandardOutput=append:/mnt/d/Project/CrawlerProject/logs/daily_digest.log
StandardError=append:/mnt/d/Project/CrawlerProject/logs/daily_digest.log

[Install]
WantedBy=default.target
EOF

cat << 'EOF' > "$SERVICE_DIR/daily-digest.timer"
[Unit]
Description=Timer for Daily Curated Tech Digest (Runs at 08:00 AM daily)

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

echo ">> 重载 systemd 用户守护进程..."
systemctl --user daemon-reload

echo ">> 启动并启用 daily-digest.timer..."
systemctl --user enable daily-digest.timer
systemctl --user restart daily-digest.timer

echo ">> 检查定时器状态:"
systemctl --user list-timers --all | grep daily-digest || true

echo ""
echo "🎉 安装完成！每天早上 08:00 将自动执行抓取。"
echo "你随时可通过以下命令查看实时运行日志:"
echo "  tail -f /mnt/d/Project/CrawlerProject/logs/daily_digest.log"
