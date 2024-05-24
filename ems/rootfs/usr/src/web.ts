#!/usr/bin/env -S deno run -A
import { Hono } from "https://deno.land/x/hono@v4.3.2/mod.ts";
import { doSupervisor } from "./doRequest.ts";
import { parse } from "https://deno.land/std@0.224.0/yaml/mod.ts";

const app = new Hono();

app.get("/info", async (c) => {
  const response = await doSupervisor("/core/info");
  const addon = parse(
    await Deno.readTextFile("/usr/src/addon-config.yaml")
  ) as any;
  return c.json({
    ...response,
    addon_version: addon.version,
    image: addon.image || "none",
  });
});

app.get("/backups", async (c) => {
  const response = await doSupervisor("/backups");

  return c.json(response);
});

// note this should probably be a blueprint  / automation instead :)
app.post("/backups/new/full", async (c) => {
  let name;
  try {
    let data = await c.req.json();
    name = data.name;
  } catch (e) {}
  const response = await doSupervisor("/backups/new/full", "POST", {
    //TODO: add passwords
    name,
  });

  return c.json(response);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

try {
  Deno.serve(
    {
      port: 8081,
    },
    app.fetch
  );
} catch (_e) {
  Deno.serve(
    {
      port: 8082,
    },
    app.fetch
  );
}
