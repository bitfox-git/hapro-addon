import { serve } from "bun";

const PORT = 3000;

serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;
    console.log(`Request: ${req.method} ${path}`);
    switch (true) {
      case path == "/":
        return await ping();
      case path == "/info":
        return await getInfo();
      case path == "/ip":
        return await getIp();
      case path == "/updates":
        return await getUpdates();
      case path.startsWith("/updates/") && path.endsWith("/icon"):
        return await getIconOfUpdate(path.split("/")[2]);
      case path.startsWith("/updates/") && path.endsWith("/skip"):
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await skipUpdate(path.split("/")[2]);
      case path.startsWith("/updates/") && path.endsWith("/clear"):
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await clearSkippedUpdate(path.split("/")[2]);
      case path.startsWith("/updates/"):
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await performUpdate(path.split("/")[2]);
      case path == "/reboot":
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await reboot();
      case path == "/systemmonitor/enable":
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await enableSystemMonitor();
      case path == "/systemmonitor/enable_entities":
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await enableSystemMonitorEntities();
      case path.startsWith("/statistic/history/"):
        return await getStatisticHistory(path.split("/")[3]);
      default:
        return new Response(
          JSON.stringify({ StatusCode: 404, Message: "Not Found" })
        );
    }
  },
});

//#region API GET Functions

async function ping() {
  const pingResponse = await doSupervisorRequest("/supervisor/ping");
  return new Response(JSON.stringify(pingResponse));
}

async function getIp() {
  const ipResponse = await fetch("https://ipinfo.io/ip");
  const ip = await ipResponse.text();
  return new Response(JSON.stringify({ StatusCode: 200, data: ip }));
}

async function getInfo() {
  try {
    const [coreInfo, updateInfo, hostInfo, isSMEnabled] = await Promise.all([
      doSupervisorRequest("/core/info"),
      doHaInternalApiRequest("/template", "POST", {template: `{{states.update | selectattr('state', 'equalto', 'on') | list | count}}`}),
      doSupervisorRequest("/host/info"),
      isSystemMonitorEnabled()
  ]);

    const warnings: string[] = [];
    const statistics = {
      storageUsed: "sensor.system_monitor_disk_use",
      storageFree: "sensor.system_monitor_disk_free",
      storageUsage: "sensor.system_monitor_disk_usage",
      cpuUsage: "sensor.system_monitor_processor_use",
      cpuTemp: "sensor.system_monitor_processor_temperature",
      memoryUsed: "sensor.system_monitor_memory_use",
      memoryFree: "sensor.system_monitor_memory_free",
      memoryUsage: "sensor.system_monitor_memory_usage",
    };
    const alternativeStatistics = {
      storageUsed: hostInfo.data.disk_used,
      storageFree: hostInfo.data.disk_free
    };
    if(!isSMEnabled) {
      warnings.push("System Monitor Integration is disabled");
        for (const key in statistics) {
          if (alternativeStatistics.hasOwnProperty(key)) {
            statistics[key] = alternativeStatistics[key];
            warnings.push(`Using alternative value for ${key}`);
          } else {
            statistics[key] = null;
          }
        }
    }
    else {
      const getAllEnabledStatistics = await doHaInternalApiRequest(
        `/template`,
        "POST",
        {
          template: `{% set enabled_entities = namespace(entities=[]) %}
                    {% for entity in integration_entities('System Monitor') %}
                      {% if states(entity) != "unknown" %}
                      {% set enabled_entities.entities = enabled_entities.entities + [ entity ] %}
                      {% endif %}
                    {% endfor %}
                    {{ enabled_entities.entities }}`,
        }
      );
      const enabledStatistics = JSON.parse(
        getAllEnabledStatistics.replace(/'/g, '"')
      );
      const statPromises = Object.entries(statistics).map(async ([key, entity]) => {
        if (enabledStatistics.includes(entity)) {
          const result = await doHaInternalApiRequest(`/states/${entity}`);
          return [key, parseFloat(result.state)];
        } else if (alternativeStatistics.hasOwnProperty(key)) {
          warnings.push(`Statistic ${key} is not enabled, using alternative value`);
          return [key, alternativeStatistics[key]];
        } else {
          warnings.push(`Statistic ${key} is not enabled, and no alternative value is available`);
          return [key, null];
        }
      });
    const resolvedStats = await Promise.all(statPromises);
    resolvedStats.forEach(([key, value]) => {
      statistics[key] = value;
    });
  }

    const response = {
      machine: coreInfo.data.machine,
      haVersion: coreInfo.data.version,
      updates: updateInfo,
      storage: {
        total: (statistics["storageUsed"] + statistics["storageFree"]),
        used: statistics["storageUsed"],
        free: statistics["storageFree"],
        usage: statistics["storageUsage"] ?? parseFloat(statistics["storageUsed"]) / parseFloat(statistics["storageUsed"] + statistics["storageFree"]) * 100,
      },
      cpu: {
        usage: statistics["cpuUsage"],
        temperature: statistics["cpuTemp"]
      },
      memory: {
        total: (statistics["memoryUsed"] == null || statistics["memoryFree"] == null) ? null : (statistics["memoryUsed"] + statistics["memoryFree"]),
        used: statistics["memoryUsed"],
        free: statistics["memoryFree"],
        usage: statistics["memoryUsage"],
      },
    };
    return new Response(JSON.stringify({ StatusCode: 200, data: response, Warnings: warnings }));
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function getUpdates() {
  try {
    const template = `
{% set entities = states.update | selectattr('state', 'equalto', 'on') | list %}
{% set skippedentities = states.update | selectattr('attributes.skipped_version', 'ne', None) | list %}
{% set entities = entities + skippedentities %}
[
{% for entity in entities %}
{
"version_current": "{{ entity.attributes.installed_version }}",
"version_latest": "{{ entity.attributes.latest_version }}",
"name": "{{ entity.attributes.friendly_name | replace(' Update', '') }}",
"slug": "{{ entity.entity_id | replace('update.', '') }}",
"icon": "{{ entity.attributes.entity_picture }}",
"update_running": {{ entity.attributes.in_progress | lower }},
"skipped": {{ entity.attributes.skipped_version is not none | lower }}
}{% if not loop.last %},{% endif %}
{% endfor %}
]
`;
    const response = await doHaInternalApiRequest(`/template`, "POST", {
      template: template,
    });
    const listOfUpdates = JSON.parse(response);
    return new Response(
      JSON.stringify({ StatusCode: 200, data: listOfUpdates })
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function getStatisticHistory(statistic) {
  if (!(await isSystemMonitorEnabled()))
    return new Response(
      JSON.stringify({
        StatusCode: 400,
        Message: "System Monitor Integration is disabled",
      })
    );
  const statistics = {
    cpuUsage: "sensor.system_monitor_processor_use",
    cpuTemp: "sensor.system_monitor_processor_temperature",
    memoryUsage: "sensor.system_monitor_memory_usage",
    swapUsage: "sensor.system_monitor_disk_usage",
  };

  if (!statistics.hasOwnProperty(statistic))
    return new Response(
      JSON.stringify({ StatusCode: 400, Message: "Invalid Statistic" })
    );

  const getAllEnabledStatistics = await doHaInternalApiRequest(
    `/template`,
    "POST",
    {
      template: `{% set enabled_entities = namespace(entities=[]) %}
{% for entity in integration_entities('System Monitor') %}
  {% if states(entity) != "unknown" %}
   {% set enabled_entities.entities = enabled_entities.entities + [ entity ] %}
  {% endif %}
{% endfor %}
{{ enabled_entities.entities }}`,
    }
  );
  const enabledStatistics = JSON.parse(
    getAllEnabledStatistics.replace(/'/g, '"')
  );
  if (!enabledStatistics.includes(statistics[statistic]))
    return new Response(
      JSON.stringify({ StatusCode: 400, Message: "Statistic is not enabled" })
    );
  var entityId = statistics[statistic];
  const currentDateTimeMinusOneHour = new Date(
    new Date().getTime() - 3600 * 1000
  );
  const response = await doHaInternalApiRequest(
    `/history/period/${currentDateTimeMinusOneHour.toISOString()}?filter_entity_id=${entityId}&minimal_response&no_attributes&significant_changes_only`
  );
  return new Response(JSON.stringify({ StatusCode: 200, data: response }));
}

async function getIconOfUpdate(addonSlug) {
  try {
    const template = `
{% set entity = states.update | selectattr('entity_id', 'search', 'update.${addonSlug}', ignorecase=True) | first %}
{{ entity.attributes.entity_picture }}
`;
    const response = await doHaInternalApiRequest(`/template`, "POST", {
      template: template,
    });
    if (typeof response !== "string")
      return new Response(
        JSON.stringify({ StatusCode: 404, Message: "Not Found" })
      );
    var icon = response;
    const baseUrl = "http://localhost:8123";
    if (!icon.includes("https")) {
      icon = `${baseUrl}${icon}`;
    }
    const imageResponse = await fetch(icon);
    if (!imageResponse.ok)
      return new Response("Failed to fetch icon", { status: 500 });

    const contentType =
      imageResponse.headers.get("Content-Type") || "image/png";

    const imageData = await imageResponse.arrayBuffer();
    return new Response(imageData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

//#endregion API GET Functions

//#region API POST Functions
async function reboot() {
  throw new Error("Not implemented");
}

async function performUpdate(addonSlug) {
  const idleTimeout = 3000;

  async function withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), timeout)
      ),
    ]);
  }
  try {
    const updateResult = await withTimeout(
      doHaInternalApiRequest(`/services/update/install`, "POST", {
        entity_id: `update.${addonSlug}`,
      }),
      idleTimeout
    );
    if (updateResult.includes("400 Bad Request") || updateResult.length === 0)
      return new Response(
        JSON.stringify({ StatusCode: 400, Message: "Bad Request" })
      );
    return new Response(
      JSON.stringify({ StatusCode: 200, result: updateResult })
    );
  } catch (error) {
    if (error.message === "Request timed out") {
      return new Response(
        JSON.stringify({ StatusCode: 200, Message: "Update in progress" })
      );
    }
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function skipUpdate(addonSlug) {
  try {
    const updateResult = await doHaInternalApiRequest(
      `/services/update/skip`,
      "POST",
      { entity_id: `update.${addonSlug}` }
    );
    if (updateResult.includes("400 Bad Request") || updateResult.length === 0)
      return new Response(
        JSON.stringify({ StatusCode: 400, Message: "Bad Request" })
      );
    return new Response(
      JSON.stringify({ StatusCode: 200, result: updateResult })
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function clearSkippedUpdate(addonSlug) {
  try {
    const updateResult = await doHaInternalApiRequest(
      `/services/update/clear_skipped`,
      "POST",
      { entity_id: `update.${addonSlug}` }
    );
    console.log(updateResult);
    if (updateResult.includes("400 Bad Request") || updateResult.length === 0)
      return new Response(
        JSON.stringify({ StatusCode: 400, Message: "Bad Request" })
      );
    return new Response(
      JSON.stringify({ StatusCode: 200, result: updateResult })
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function enableSystemMonitor() {
  const configEntries = Bun.file("/homeassistant/.storage/core.config_entries");
  const configEntriesText = await configEntries.text();
  const configEntriesContent = JSON.parse(configEntriesText);
  const systemMonitorEntry = configEntriesContent.data.entries.find(
    (entry) => entry.domain === "systemmonitor"
  );
  if (systemMonitorEntry && systemMonitorEntry.disabled_by === null) {
    console.log("System Monitor is already enabled");
    return new Response(
      JSON.stringify({
        StatusCode: 400,
        Message: "System Monitor is already enabled",
      })
    );
  }
  if (systemMonitorEntry) {
    systemMonitorEntry.disabled_by = null;
    await Bun.write("/homeassistant/.storage/core.config_entries", JSON.stringify(configEntriesContent, null, 2));
    console.log("System Monitor is now enabled");
    setTimeout(async () => {
      try {
        await fetch("http://supervisor/core/restart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Bun.env.SUPERVISOR_TOKEN}`,
          },
        });
      } catch (error) {
        console.error("Error during system restart:", error);
      }
    }, 500);
    return new Response(
      JSON.stringify({
        StatusCode: 200,
        Message: "System Monitor is now enabled, Home Assistant is restarting",
      })
    );
  }
  const dateTime = new Date().toISOString();
  const systemMonitorConfig = {
    created_at: dateTime,
    data: {},
    discovery_keys: {},
    disabled_by: null,
    domain: "systemmonitor",
    entry_id: crypto.randomUUID().replace(/-/g, '').substring(0, 26).toUpperCase(),
    minor_version: 3,
    modified_at: dateTime,
    options: {},
    pref_disable_new_entities: false,
    pref_disable_polling: false,
    source: "user",
    title: "System Monitor",
    unique_id: null,
    version: 1
  };
  configEntriesContent.data.entries.push(systemMonitorConfig);
  await Bun.write("/homeassistant/.storage/core.config_entries", JSON.stringify(configEntriesContent, null, 2));
  console.log("System Monitor is now installed");
  const configEntries2 = Bun.file("/homeassistant/.storage/core.config_entries");
  const configEntriesText2 = await configEntries2.text();
  const configEntriesContent2 = JSON.parse(configEntriesText2);
  const systemMonitorEntry2 = configEntriesContent2.data.entries.find(
    (entry) => entry.domain === "systemmonitor"
  );

  console.log("Home Assistant is restarting");
  setTimeout(async () => {
    try {
      await fetch("http://supervisor/core/restart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Bun.env.SUPERVISOR_TOKEN}`,
        },
      });
    } catch (error) {
      console.error("Error during system restart:", error);
    }
  }, 500);

  return new Response(
    JSON.stringify({
      StatusCode: 200,
      Message: "System Monitor is now installed, Home Assistant is restarting",
    })
  );
}

async function enableSystemMonitorEntities() {
  const isSMEnabled = await isSystemMonitorEnabled();
  if (!isSMEnabled) {
    console.log("System Monitor is disabled, cannot enable entities");
    return new Response(
      JSON.stringify({
        StatusCode: 400,
        Message: "System Monitor is disabled, cannot enable entities",
      })
    );
  }
  const entityEntries = Bun.file("/homeassistant/.storage/core.entity_registry");
  const entityEntriesText = await entityEntries.text();
  const entityEntriesContent = JSON.parse(entityEntriesText);
  const statistics = {
    storageUsed: "sensor.system_monitor_disk_use",
    storageFree: "sensor.system_monitor_disk_free",
    storageUsage: "sensor.system_monitor_disk_usage",
    cpuUsage: "sensor.system_monitor_processor_use",
    cpuTemp: "sensor.system_monitor_processor_temperature",
    memoryUsed: "sensor.system_monitor_memory_use",
    memoryFree: "sensor.system_monitor_memory_free",
    memoryUsage: "sensor.system_monitor_memory_usage",
  };
  for (const key in statistics) {
    if (statistics[key] !== null) {
      const entity = entityEntriesContent.data.entities.find(
        (entry) => entry.entity_id === statistics[key]
      );
      if (entity) {
        entity.disabled_by = null;
        entity.hidden_by = null;
      }
    }
  }
  await Bun.write("/homeassistant/.storage/core.entity_registry", JSON.stringify(entityEntriesContent, null, 2));
  console.log("Enabled System Monitor entities");

  console.log("Home Assistant is restarting");
  setTimeout(async () => {
    try {
      await fetch("http://supervisor/core/restart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Bun.env.SUPERVISOR_TOKEN}`,
        },
      });
    } catch (error) {
      console.error("Error during system restart:", error);
    }
  }, 500);

  return new Response(
    JSON.stringify({
      StatusCode: 200,
      Message: "Enabled System Monitor entities, Home Assistant is restarting",
    })
  );
}

//#endregion API POST Functions

//#region Helper functions

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
  return JSON.parse(response.replace(/'/g, '"')).length > 0
}
//#endregion Helper functions

console.log(`Listening on http://localhost:${PORT} ...`);
