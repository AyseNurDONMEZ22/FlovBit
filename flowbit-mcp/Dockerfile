FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV MCP_TRANSPORT=http
# PORT'u Railway/Render otomatik ayarlar, index.ts process.env.PORT'u okuyor.

CMD ["npx", "tsx", "index.ts"]