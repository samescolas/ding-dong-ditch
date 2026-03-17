# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc
COPY client/ client/
RUN cd client && npm ci && npx vite build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ dist/

RUN mkdir -p /app/config /recordings

EXPOSE 3000

CMD ["node", "dist/index.js"]
