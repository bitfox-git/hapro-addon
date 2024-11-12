import { serve } from "bun";
import { watchBackupDirectory } from "./webApiControllers/watchBackup";
import * as helpers from "./webApiControllers/apiHelperService";
import * as backupController from "./webApiControllers/backupController";
import * as updateController from "./webApiControllers/updateController";
import * as statisticController from "./webApiControllers/statisticController";

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
        return await updateController.getUpdates();
      case path.startsWith("/updates/") && path.endsWith("/icon"):
        return await updateController.getIconOfUpdate(path.split("/")[2]);
      case path.startsWith("/updates/") && path.endsWith("/skip"):
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await updateController.skipUpdate(path.split("/")[2]);
      case path.startsWith("/updates/") && path.endsWith("/clear"):
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await updateController.clearSkippedUpdate(path.split("/")[2]);
      case path.startsWith("/updates/"):
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await updateController.performUpdate(path.split("/")[2]);
      case path == "/systemmonitor/enable":
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await statisticController.enableSystemMonitor();
      case path == "/systemmonitor/enable_entities":
        if (req.method !== "POST")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await statisticController.enableSystemMonitorEntities();
      case path.startsWith("/statistic/history/"):
        return await statisticController.getStatisticHistory(path.split("/")[3]);
      case path == "/backups":
        return await backupController.getBackups();
      case path.startsWith("/backups/") && path.endsWith("/info"):
        return await backupController.getBackupInfo(path.split("/")[2]);
      case path.startsWith("/backups/") && path.endsWith("/download"):
        return await backupController.downloadBackup(path.split("/")[2]);
      case path.startsWith("/backups/") && path.endsWith("/delete"):
        if (req.method !== "DELETE")
          return new Response(
            JSON.stringify({ StatusCode: 405, Message: "Method Not Allowed" })
          );
        return await backupController.deleteBackup(path.split("/")[2]);
      default:
        return new Response(
          JSON.stringify({ StatusCode: 404, Message: "Not Found" })
        );
    }
  },
});

async function ping() {
  const pingResponse = await helpers.doSupervisorRequest("/supervisor/ping");
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
      helpers.doSupervisorRequest("/core/info"),
      helpers.doHaInternalApiRequest("/template", "POST", {template: `{{states.update | selectattr('state', 'equalto', 'on') | list | count}}`}),
      helpers.doSupervisorRequest("/host/info"),
      helpers.isSystemMonitorEnabled()
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
      const getAllEnabledStatistics = await helpers.doHaInternalApiRequest(
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
          const result = await helpers.doHaInternalApiRequest(`/states/${entity}`);
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

console.log(`Listening on http://localhost:${PORT} ...`);

watchBackupDirectory();
