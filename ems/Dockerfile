# https://developers.home-assistant.io/docs/add-ons/configuration#add-on-dockerfile
ARG BUILD_FROM
FROM ghcr.io/dvdplaat/rathole:latest as rathole
FROM denoland/deno:debian as deno
FROM caddy:latest as caddy
FROM $BUILD_FROM
ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt install -y git curl nano vim ssh && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/BeryJu/hass-auth-header /usr/src/hass-auth-header
COPY hass-auth-header /usr/src/hass-auth-header

COPY --from=rathole /app/rathole /usr/bin/rathole
COPY --from=deno /usr/bin/deno /usr/bin/deno
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy

COPY rootfs /
COPY config.yaml /usr/src/addon-config.yaml
