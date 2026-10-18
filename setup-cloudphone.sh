#!/usr/bin/env bash
# ========================================================
# Script tự động thiết lập và chạy Bot Ma Sói trên Cloud Phone (Termux/Linux)
# ========================================================

set -e

echo "🚀 [1/5] Kiểm tra môi trường Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Chưa tìm thấy Node.js! Đang tiến hành cài đặt..."
    if command -v pkg &> /dev/null; then
        pkg update -y && pkg install nodejs-lts git -y
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update -y && sudo apt-get install -y nodejs npm git
    else
        echo "❌ Vui lòng cài đặt Node.js v20+ hoặc v22+ trước khi tiếp tục."
        exit 1
    fi
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js phiên bản: $NODE_VERSION"

echo "📦 [2/5] Đang cài đặt thư viện dependencies..."
npm install

echo "🔨 [3/5] Đang biên dịch TypeScript sang JavaScript..."
npm run build

echo "⚙️ [4/5] Kiểm tra file cấu hình .env..."
if [ ! -f .env ]; then
    echo "⚠️ Chưa có file .env!"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📄 Đã tạo file .env từ .env.example."
    fi
    echo "👉 Vui lòng mở file .env và điền DISCORD_TOKEN và CLIENT_ID của bạn:"
    echo "   nano .env"
    exit 0
fi

echo "✨ [5/5] Đăng ký Slash Command với Discord..."
npm run register

echo "🎉 Hoàn tất cài đặt! Bạn có thể bắt đầu chạy bot bằng một trong hai cách:"
echo "   1. Chạy trực tiếp: npm start"
echo "   2. Chạy ngầm 24/7 với PM2: npx pm2 start dist/index.js --name werewolf-bot"
