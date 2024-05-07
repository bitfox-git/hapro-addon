#!/usr/bin/env bash

# docker exec -it $(docker ps --filter "name=ems" --format "{{.ID}}") /bin/bash

container=$(docker ps --filter name=addon_local_ems --format "{{.ID}}")
exec docker exec -it $container /bin/bash