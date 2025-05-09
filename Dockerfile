# Dockerfile
ARG APP_PATH=/opt/outline
FROM node:20-slim AS runner

ARG APP_PATH
WORKDIR $APP_PATH

ENV NODE_ENV=production

# Copy precompiled + production-installed app files from host
COPY ./build ./build
COPY ./server ./server
COPY ./public ./public
COPY ./.sequelizerc ./.sequelizerc
COPY ./node_modules ./node_modules
COPY ./package.json ./package.json

# Install wget for healthcheck
RUN apt-get update \
  && apt-get install -y wget \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user and prepare volume
RUN addgroup --gid 1001 nodejs && \
    adduser --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs $APP_PATH/build && \
    mkdir -p /var/lib/outline && \
    chown -R nodejs:nodejs /var/lib/outline

ENV FILE_STORAGE_LOCAL_ROOT_DIR=/var/lib/outline/data
RUN mkdir -p "$FILE_STORAGE_LOCAL_ROOT_DIR" && \
    chown -R nodejs:nodejs "$FILE_STORAGE_LOCAL_ROOT_DIR" && \
    chmod 1777 "$FILE_STORAGE_LOCAL_ROOT_DIR"

VOLUME /var/lib/outline/data

USER nodejs

HEALTHCHECK --interval=1m CMD wget -qO- "http://localhost:${PORT:-3000}/_health" | grep -q "OK" || exit 1

EXPOSE 3000
CMD ["yarn", "start"]