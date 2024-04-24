import { baseUrl, headers } from "./utils.ts";
const data = await fetch(`${baseUrl}/core/info`, {
  headers,
}).then((r) => r.json());

// if this request fails im sure it'll be noticed somewhere else lol

Deno.stdout.write(new TextEncoder().encode(`${data.data.port}`));
