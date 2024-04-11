#!/usr/bin/env bash

docker run \
    --rm \
    -v ~/.docker:/root/.docker \
	-v /var/run/docker.sock:/var/run/docker.sock:ro \
    --privileged \
    -v ${PWD}:/data \
            ghcr.io/home-assistant/amd64-builder:latest \
            --amd64 \
            --test \
            --target /data