FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 复制源码
COPY src ./src
COPY knexfile.js ./
COPY public ./public
COPY deploy ./deploy
COPY scripts ./scripts

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3000

CMD ["node", "src/app.js"]
