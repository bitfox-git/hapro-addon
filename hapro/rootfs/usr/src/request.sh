#!/usr/bin/with-contenv bashio
source /usr/src/config/vars.sh

doSupervisorRequest() {
    local url=$1
    local method=${2:-"GET"}
    local data=${3:-""}
    response=$(curl -s -X "${method}" -H "X-Supervisor-Token: $(printenv SUPERVISOR_TOKEN)" -d "${data}" "http://supervisor/${url}")
}

doHaInternalApiRequest() {
    local url=$1
    local method=${2:-"GET"}
    local data=${3:-""}
    local bearer=$(printenv SUPERVISOR_TOKEN)
    response=$(curl -s -X "${method}" -H "Authorization: Bearer $bearer" -d "${data}" "http://supervisor/core/api/${url}")
}

#FIXME: This is a simple version
doHaProApiRequest() {
    local url=$1
    local method=${2:-"GET"}
    local data=${3:-""}
    response=$(curl "$HaproApi/${url}")
}