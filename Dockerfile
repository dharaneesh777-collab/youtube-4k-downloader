# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install python3 for yt-dlp postinstall, and other build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Skip postinstall scripts that download platform binaries — we install them as system packages
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install ffmpeg and yt-dlp as system packages (much more reliable than npm binaries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

# Copy standalone output from build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create temp directory for downloads
RUN mkdir -p .temp

EXPOSE 3000

CMD ["node", "server.js"]
