#!/usr/bin/with-contenv bashio
source /usr/src/config/vars.sh

doSupervisorRequest() {
    local url=$1
    local method=${2:-"GET"}
    local data=${3:-""}
    response=$(curl -s -X "${method}" -H "X-Supervisor-Token: $(printenv SUPERVISOR_TOKEN)" -d "${data}" "http://supervisor/${url}")
    bashio::log.notice "SUPERVISOR REQUEST: $method $url"
    bashio::log.notice "SUPERVISOR RESPONSE: $response"
}

doHaInternalApiRequest() {
    local url=$1
    local method=${2:-"GET"}
    local data=${3:-""}
    local bearer=$(printenv SUPERVISOR_TOKEN)
    response=$(curl -s -X "${method}" -H "Authorization: Bearer $bearer" -d "${data}" "http://supervisor/core/api/${url}")
    bashio::log.notice "HA INTERNAL API REQUEST: $method $url"
    bashio::log.notice "HA INTERNAL API RESPONSE: $response"
}