# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# This project has no real backend — the API is mocked with MSW, which is
# bundled into the production build so the container is self-contained.
# Set to 'false' to point the app at a real backend instead:
#
#     docker build --build-arg VITE_ENABLE_MOCK_API=false -t app:real .
ARG VITE_ENABLE_MOCK_API=true
ENV VITE_ENABLE_MOCK_API=$VITE_ENABLE_MOCK_API

RUN pnpm build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

# Remove the packaged default server block
RUN rm /etc/nginx/conf.d/default.conf

# Point nginx's PID file at a writable location.
# `pid` is a main-context directive — it can only live in /etc/nginx/nginx.conf,
# not in conf.d/default.conf. This is required because we run as non-root.
RUN sed -i 's|^pid .*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf

# Copy our SPA server block
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built bundle
COPY --from=build /app/dist /usr/share/nginx/html

# Run as non-root: create the user and give it ownership of
# everything nginx touches at runtime (html root, cache, conf).
RUN addgroup -S app && adduser -S app -G app \
  && chown -R app:app \
      /usr/share/nginx/html \
      /var/cache/nginx \
      /var/run \
      /etc/nginx/conf.d

USER app

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]