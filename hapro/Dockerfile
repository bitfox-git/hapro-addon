ARG BUILD_FROM
# TODO move this to a bitfox managed registry
FROM ghcr.io/dvdplaat/rathole:latest as rathole
FROM caddy:latest as caddy
FROM $BUILD_FROM

COPY --from=rathole /app/rathole /usr/bin/rathole
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY rootfs /