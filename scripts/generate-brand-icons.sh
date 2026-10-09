#!/usr/bin/env bash
set -euo pipefail

echo "================================================="
echo "Generating MyFitAI Brand & Android Native Assets"
echo "================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p public/brand

# 1. Generate 512x512 Master Mark PNG
echo "Generating public/brand/myfitai-icon-512.png..."
sips -s format png public/favicon.svg --out public/brand/myfitai-icon-512.png
sips -z 512 512 public/brand/myfitai-icon-512.png

# 2. Generate 1024x1024 Master Icon PNG
echo "Generating public/brand/myfitai-icon-1024.png..."
cp public/brand/myfitai-icon-512.png public/brand/myfitai-icon-1024.png
sips -z 1024 1024 public/brand/myfitai-icon-1024.png

# 3. Generate Android Adaptive Foreground Master (432x432)
echo "Generating Android Adaptive Foreground Master..."
sips -s format png public/brand/myfitai-adaptive-foreground.svg --out public/brand/myfitai-adaptive-foreground.png
sips -z 432 432 public/brand/myfitai-adaptive-foreground.png

# 4. Generate Master Splash PNG
echo "Generating Splash Master..."
sips -s format png public/brand/myfitai-splash.svg --out public/brand/splash-master.png

# 5. Populate Android Mipmap Directories
RES_DIR="android/app/src/main/res"

# Density mapping for legacy launcher icon & adaptive foreground:
# mdpi:    48x48  / fg: 108x108
# hdpi:    72x72  / fg: 162x162
# xhdpi:   96x96  / fg: 216x216
# xxhdpi:  144x144 / fg: 324x324
# xxxhdpi: 192x192 / fg: 432x432

echo "Updating mipmap-mdpi..."
sips -z 48 48 public/brand/myfitai-icon-512.png --out "$RES_DIR/mipmap-mdpi/ic_launcher.png"
cp "$RES_DIR/mipmap-mdpi/ic_launcher.png" "$RES_DIR/mipmap-mdpi/ic_launcher_round.png"
sips -z 108 108 public/brand/myfitai-adaptive-foreground.png --out "$RES_DIR/mipmap-mdpi/ic_launcher_foreground.png"

echo "Updating mipmap-hdpi..."
sips -z 72 72 public/brand/myfitai-icon-512.png --out "$RES_DIR/mipmap-hdpi/ic_launcher.png"
cp "$RES_DIR/mipmap-hdpi/ic_launcher.png" "$RES_DIR/mipmap-hdpi/ic_launcher_round.png"
sips -z 162 162 public/brand/myfitai-adaptive-foreground.png --out "$RES_DIR/mipmap-hdpi/ic_launcher_foreground.png"

echo "Updating mipmap-xhdpi..."
sips -z 96 96 public/brand/myfitai-icon-512.png --out "$RES_DIR/mipmap-xhdpi/ic_launcher.png"
cp "$RES_DIR/mipmap-xhdpi/ic_launcher.png" "$RES_DIR/mipmap-xhdpi/ic_launcher_round.png"
sips -z 216 216 public/brand/myfitai-adaptive-foreground.png --out "$RES_DIR/mipmap-xhdpi/ic_launcher_foreground.png"

echo "Updating mipmap-xxhdpi..."
sips -z 144 144 public/brand/myfitai-icon-512.png --out "$RES_DIR/mipmap-xxhdpi/ic_launcher.png"
cp "$RES_DIR/mipmap-xxhdpi/ic_launcher.png" "$RES_DIR/mipmap-xxhdpi/ic_launcher_round.png"
sips -z 324 324 public/brand/myfitai-adaptive-foreground.png --out "$RES_DIR/mipmap-xxhdpi/ic_launcher_foreground.png"

echo "Updating mipmap-xxxhdpi..."
sips -z 192 192 public/brand/myfitai-icon-512.png --out "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png"
cp "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png" "$RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png"
sips -z 432 432 public/brand/myfitai-adaptive-foreground.png --out "$RES_DIR/mipmap-xxxhdpi/ic_launcher_foreground.png"

# 6. Update Splash Drawables
echo "Updating splash drawables..."
sips -z 800 480 public/brand/splash-master.png --out "$RES_DIR/drawable/splash.png"
sips -z 480 320 public/brand/splash-master.png --out "$RES_DIR/drawable-port-mdpi/splash.png"
sips -z 800 480 public/brand/splash-master.png --out "$RES_DIR/drawable-port-hdpi/splash.png"
sips -z 1280 720 public/brand/splash-master.png --out "$RES_DIR/drawable-port-xhdpi/splash.png"
sips -z 1600 960 public/brand/splash-master.png --out "$RES_DIR/drawable-port-xxhdpi/splash.png"
sips -z 1920 1080 public/brand/splash-master.png --out "$RES_DIR/drawable-port-xxxhdpi/splash.png"

echo "All Android launcher & splash assets generated successfully!"
