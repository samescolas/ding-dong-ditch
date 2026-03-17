# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc
COPY client/ client/
RUN cd client && npm ci && npx vite build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN apk add --no-cache ffmpeg python3 make g++ && \
    npm ci --omit=dev && \
    apk del python3 make g++ && \
    rm -rf /root/.npm

COPY --from=builder /app/dist/ dist/

RUN mkdir -p /app/config /recordings

EXPOSE 3000

CMD ["node", "dist/index.js"]
