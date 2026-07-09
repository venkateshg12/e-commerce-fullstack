#!/bin/bash
set -e

echo "============================================="
echo "🛍️ Starting Monorepo pnpm Workspace Migration"
echo "============================================="

# 1. Remove npm package-lock.json files
echo "🗑️ Removing package-lock.json files..."
rm -f package-lock.json
rm -f apps/backends/mongo/package-lock.json 2>/dev/null || true

# 2. Rename and move backend service to apps/auth-service
if [ -d "apps/backends/mongo" ]; then
  echo "🚚 Moving apps/backends/mongo to apps/auth-service..."
  mv apps/backends/mongo apps/auth-service
else
  echo "⚠️ apps/backends/mongo not found, skipping move."
fi

# 3. Clean up empty placeholder directories
echo "🧹 Cleaning up empty placeholder directories..."
rm -rf apps/backends/hono 2>/dev/null || true
rm -rf apps/backends/nestjs 2>/dev/null || true
rm -rf apps/backends/postgres 2>/dev/null || true
if [ -d "apps/backends" ]; then
  echo "🧹 Removing apps/backends container directory..."
  rmdir apps/backends 2>/dev/null || true
fi

# 4. Install dependencies using pnpm
echo "📦 Installing dependencies using pnpm..."
pnpm install

echo "============================================="
echo "✅ Migration Completed Successfully!"
echo "Please verify by running:"
echo "  pnpm build"
echo "  pnpm typecheck"
echo "  pnpm dev"
echo "============================================="
