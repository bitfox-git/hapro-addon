#!/usr/bin/env bash

container=$(docker ps --filter name=addon_local_ems --format "{{.ID}}")
exec docker exec -it $container /bin/bash