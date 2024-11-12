async function doSupervisorRequest(
  path: string,
  method = "GET",
  body = undefined
) {
  const response = await fetch(`http://supervisor${path}`, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Bun.env.SUPERVISOR_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await response.json();
}

async function doHaInternalApiRequest(
  path: string,
  method = "GET",
  body: object | undefined = undefined
) {
  const response = await fetch(`http://supervisor/core/api${path}`, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Bun.env.SUPERVISOR_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.headers.get("content-type") === "application/json")
    return await response.json();
  return await response.text();
}

async function isSystemMonitorEnabled() {
  const configEntries = Bun.file("/homeassistant/.storage/core.config_entries");
  const configEntriesText = await configEntries.text();
  const configEntriesContent = JSON.parse(configEntriesText);
  const systemMonitorEntry = configEntriesContent.data.entries.find(
    (entry) => entry.domain === "systemmonitor"
  );
  if (systemMonitorEntry && systemMonitorEntry.disabled_by !== null) {
    return false;
  }

  const response = await doHaInternalApiRequest(`/template`, "POST", {
    template: `{{ integration_entities('System Monitor') }}`,
  });
  return JSON.parse(response.replace(/'/g, '"')).length > 0;
}

export { doSupervisorRequest, doHaInternalApiRequest, isSystemMonitorEnabled };