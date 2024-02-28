# https://developers.home-assistant.io/docs/add-ons/configuration#add-on-dockerfile
ARG BUILD_FROM
FROM ghcr.io/dvdplaat/rathole as rathole
FROM $BUILD_FROM

RUN apk add git
RUN git clone https://github.com/BeryJu/hass-auth-header /usr/src/hass-auth-header

# Execute during the build of the image
ARG TEMPIO_VERSION BUILD_ARCH
RUN \
    curl -sSLf -o /usr/bin/tempio \
    "https://github.com/home-assistant/tempio/releases/download/${TEMPIO_VERSION}/tempio_${BUILD_ARCH}"

COPY --from=rathole /app/rathole /usr/bin/rathole

COPY rootfs /
