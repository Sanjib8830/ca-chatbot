FROM node:20-alpine AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    STATIC_DIR=/app/frontend

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci --omit=dev --workspace @ca-chatbot/backend && npm cache clean --force

COPY --from=build /workspace/backend/dist ./backend/dist
COPY --from=build /workspace/frontend/dist ./frontend

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider --quiet http://127.0.0.1:3001/ || exit 1

CMD ["node", "backend/dist/src/index.js"]
