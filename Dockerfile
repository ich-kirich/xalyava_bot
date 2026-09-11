FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY config ./config
COPY src ./src

RUN npm install && npx tsc

EXPOSE 3001

CMD ["node", "dist/index.js"]
