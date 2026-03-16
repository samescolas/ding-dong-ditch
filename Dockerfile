# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc

# Production stage
FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ dist/
COPY src/public/ dist/public/

RUN mkdir -p /app/config /recordings

EXPOSE 3000

CMD ["node", "dist/index.js"]
