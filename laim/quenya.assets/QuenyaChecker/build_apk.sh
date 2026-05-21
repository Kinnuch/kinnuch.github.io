#!/bin/bash
# QuenyaChecker APK 打包脚本
# 在 WSL2 (Ubuntu) 中运行此脚本
#
# 前置条件：
#   1. 已安装 WSL2 + Ubuntu:
#      (在 PowerShell 管理员模式下) wsl --install -d Ubuntu
#
#   2. 首次运行需要安装依赖（约 10-15 分钟）：
#      sudo apt update && sudo apt install -y \
#        python3 python3-pip python3-venv \
#        build-essential git zip unzip \
#        openjdk-17-jdk autoconf libtool \
#        libffi-dev libssl-dev \
#        cmake pkg-config
#
#   3. 安装 buildozer:
#      pip3 install --user buildozer cython
#
# 用法：
#   cd /mnt/c/Users/Administrator/Documents/GitHub/kinnuch.github.io/laim/quenya.assets/QuenyaChecker
#   bash build_apk.sh
#
# 输出：
#   bin/QuenyaChecker-1.0.0-arm64-v8a_armeabi-v7a-debug.apk

set -e

echo "=== QuenyaChecker APK 打包 ==="
echo ""

# 检查 buildozer
if ! command -v buildozer &> /dev/null; then
    echo "错误: buildozer 未安装"
    echo "请运行: pip3 install --user buildozer cython"
    exit 1
fi

# 检查 Java
if ! command -v javac &> /dev/null; then
    echo "错误: JDK 未安装"
    echo "请运行: sudo apt install -y openjdk-17-jdk"
    exit 1
fi

echo "开始构建 APK（首次构建需下载 Android SDK/NDK，约 20-30 分钟）..."
echo ""

# 设置入口文件为 Kivy 版本
export P4A_ENTRYPOINT=quenya_checker_kivy.py

buildozer android debug

echo ""
echo "=== 构建完成 ==="
echo "APK 位置: $(ls bin/*.apk 2>/dev/null || echo '未找到')"
echo ""
echo "安装到手机（USB 调试模式）:"
echo "  buildozer android deploy"
echo ""
echo "或手动复制 APK 到手机安装"
