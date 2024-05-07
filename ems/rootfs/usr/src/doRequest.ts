#!/usr/bin/env -S deno run -A
import hapro from "./config/hapro.json" with { type: "json" };
import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";

async function getOptions() {
    const isHa = !!Deno.env.get("SUPERVISOR_TOKEN");
    if(isHa) {
        return JSON.parse(await Deno.readTextFile("/data/options.json"));
    } else {
        return {}
    }
}

const options = await getOptions();

function replaceVariables(inputString: string, object: Record<string, any>) {
  return inputString.replace(/\{([^}]+)\}/g, function (match, varName) {
    return object[varName.trim()] || match;
  });
}

//TODO: make this deal with auth and shit man
export async function doRequest(
  path: string,
  method = "GET",
  body: any = undefined,
  {
    text
  }: {
    text?: boolean
  } = {}
) {
  path = replaceVariables(path, options);
  let p = `${hapro.admin_api}${path}`.replace("//", "/");
  const response = await fetch(p, {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    console.log(await response.text());
    console.log(`status: ${response.status} path: ${p}\nbody: ${body}`)
  }
  if(text) return await response.text()
  return await response.json();
}

function supervisorHeaders() {
  return {
    Authorization: `Bearer ${Deno.env.get("SUPERVISOR_TOKEN")}`,
  }
};

export const baseSupervisorUrl = "http://supervisor";

export async function doSupervisor(
  path: string,
  method = "GET",
  body: any = undefined,
) {
  const response = await fetch(
    `${baseSupervisorUrl}${path}`.replace("//", "/"),
    {
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...supervisorHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  return await response.json();
}

if (import.meta.main) {
  const args = parse(Deno.args);
  console.log(
    await doRequest(
      args.path,
      args.method,
      args.body,
    ),
  );
}
