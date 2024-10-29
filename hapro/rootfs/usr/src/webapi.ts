import { serve } from 'bun';

const PORT = 3000;
 
serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;

    switch (path) {
      case "/":
        return await ping();
      case "/info":
        return await getInfo();
      default:
        return new Response(JSON.stringify({ status: 404, error: "Not Found" }));
    }
  },
});

async function ping() {
  const pingResponse = await doSupervisorRequest("/supervisor/ping");
  return new Response(JSON.stringify(pingResponse));
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
    }
    return new Response(JSON.stringify({ status: 200, data: response })); 
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ status: 500, error: "Internal Server Error" }));
  }
}

async function doSupervisorRequest(path: string, method = "GET", body = undefined) {
  const response = await fetch(
    `http://supervisor${path}`,
    {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Bun.env.SUPERVISOR_TOKEN}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  return await response.json();
}
 
console.log(`Listening on http://localhost:${PORT} ...`);