#!/usr/bin/env -S deno run -A
import { doSupervisor } from "./doRequest.ts";
const data = await doSupervisor("/core/info");

// if this request fails im sure it'll be noticed somewhere else lol

Deno.stdout.write(new TextEncoder().encode(`${data.data.port}`));
