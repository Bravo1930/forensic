FROM node:22-slim AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json ./
COPY shared ./shared
COPY drizzle ./drizzle
COPY server ./server
COPY client ./client
COPY vite.config.ts components.json ./

ENV NODE_ENV=production
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy build output
COPY --from=build /app/dist ./dist

# Create required directories
RUN mkdir -p uploads data

EXPOSE 3000

CMD ["node", "dist/index.js"]
