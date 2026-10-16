FROM node:22-slim

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source and pre-built 3D GLB assets
COPY tsconfig.json vite.config.ts ./
COPY shared ./shared
COPY server ./server
COPY client ./client

# Build the React Three Fiber frontend into dist/client
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
