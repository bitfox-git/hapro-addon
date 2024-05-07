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

try {
  Deno.serve(
    {
      port: 8081,
    },
    app.fetch
  );
} catch (e) {
  Deno.serve(
    {
      port: 8082,
    },
    app.fetch
  );
}
