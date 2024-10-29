ARG BUILD_FROM
# TODO move this to a bitfox managed registry
FROM ghcr.io/dvdplaat/rathole:latest as rathole
FROM caddy:latest as caddy
FROM oven/bun:latest as bun
FROM $BUILD_FROM
ENV DEBIAN_FRONTEND=noninteractive

COPY --from=bun  /usr/local/bin/bun /usr/bin/bun
COPY --from=rathole /app/rathole /usr/bin/rathole
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY rootfs /