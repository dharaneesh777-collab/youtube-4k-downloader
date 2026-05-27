# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install ffmpeg system-wide (more reliable in Linux containers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally
RUN npm install -g yt-dlp-exec || true
RUN npx --yes yt-dlp-wrap@latest --download || true

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy node_modules for native binaries (yt-dlp, ffmpeg-static)
COPY --from=builder /app/node_modules/youtube-dl-exec ./node_modules/youtube-dl-exec
COPY --from=builder /app/node_modules/ffmpeg-static ./node_modules/ffmpeg-static

# Create temp directory for downloads
RUN mkdir -p .temp

EXPOSE 3000

CMD ["node", "server.js"]
