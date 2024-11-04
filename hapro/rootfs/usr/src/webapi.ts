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
    const coreInfo = await doSupervisorRequest("/core/info");
    const updateInfo = await doSupervisorRequest("/available_updates");
    const hostInfo = await doSupervisorRequest("/host/info");
    const observerInfo = await doSupervisorRequest("/observer/stats");
    const response = {
      machine: coreInfo.data.machine,
      haVersion: coreInfo.data.version,
      updates: updateInfo.data.available_updates.length,
      storage: {
        total: hostInfo.data.disk_total,
        used: hostInfo.data.disk_used,
        free: hostInfo.data.disk_free,
      },
      cpu: {
        usage: observerInfo.data.cpu_percent,
      },
      memory: {
        usage: observerInfo.data.memory_usage,
        limit: observerInfo.data.memory_limit,
        percent: observerInfo.data.memory_percent,
      },
    };
    return new Response(JSON.stringify({ StatusCode: 200, data: response }));
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function getUpdates() {
  try {
    const installedAddons = await doSupervisorRequest("/addons");
    const availableUpdates = await doSupervisorRequest("/available_updates");
    const listOfUpdates = availableUpdates.data.available_updates;
    const jobsInfo = await doSupervisorRequest("/jobs/info");
    await Promise.all(
      listOfUpdates.map(async (update: any) => {
        delete update.panel_path;
        switch (update.update_type) {
          case "os":
            const osInfo = await doSupervisorRequest(`/os/info`);
            update.version_current = osInfo.data.version;
            update.name = "operating system";
            break;
          case "supervisor":
            const supervisorInfo = await doSupervisorRequest(
              `/supervisor/info`
            );
            update.version_current = supervisorInfo.data.version;
            update.name = "supervisor";
            break;
          case "core":
            const coreInfo = await doSupervisorRequest(`/core/info`);
            update.version_current = coreInfo.data.version;
            update.name = "core";
            break;
          case "addon":
            const addon = installedAddons.data.addons.find(
              (a: any) => a.name === update.name
            );
            const job = jobsInfo.data.jobs.find((a: any) =>
              a.reference.includes(addon.slug)
            );
            update.update_running = job != undefined;
            update.version_current = addon.version;
            break;
          default:
            update.version_current = null;
            break;
        }
        const template = `
{% set entity = states.update | selectattr('attributes.title', 'search', '${update.name}', ignorecase=True) | first %}
{
  "slug": "{{ entity.entity_id }}",
  "icon": "{{ entity.attributes.entity_picture }}",
  "skipped": "{{ entity.attributes.skipped_version }}"
}
`;
        const response = await doHaInternalApiRequest(`/template`, "POST", {
          template: template,
        });
        const { slug, icon, skipped } = JSON.parse(response);
        update.icon = icon;
        update.slug = slug.replace("update.", "");
        update.skipped = skipped == "None" ? false : true;
      })
    );
    const filteredUpdates = listOfUpdates.filter((update: any) => !update.skipped);
    return new Response(
      JSON.stringify({ StatusCode: 200, data: filteredUpdates })
    );
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

//#endregion API POST Functions

//#region Helper functions to make requests to the APIs

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

//#endregion Helper functions to make requests to the APIs

console.log(`Listening on http://localhost:${PORT} ...`);
