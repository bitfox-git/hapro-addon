#!/usr/bin/env -S deno run -A

import { doRequest, doSupervisor } from "./doRequest.ts";

const res = await doSupervisor("/core/info");

const HA_LOCATION = `${res.data.ip_address}:${res.data.port}`;

const home = await doRequest("/homes/{token}");
const domain = await doRequest("/domain", "GET", undefined, { text: true });

const PRO_HOST = `${home.hostname}.${domain}`;

console.log(`HA_LOCATION=${HA_LOCATION}\nPRO_HOST=${PRO_HOST}`);
