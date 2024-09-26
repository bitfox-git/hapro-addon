#!/command/with-contenv bashio
doSupervisorRequest() {
    local url=$1
    local method=${2:-"GET"}
    local data=${3:-""}
    response=$(curl -s -X "${method}" -H "X-Supervisor-Token: $(printenv SUPERVISOR_TOKEN)" -d "${data}" "http://supervisor/${url}")
}

#FIXME: This is a simple version
doHaProApiRequest() {
    local url=$1
    local method=${2:-"GET"}
    local data=${3:-""}
    response=$(curl "http://api.hapro.cloud/${url}")
}