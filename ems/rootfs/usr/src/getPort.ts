import { baseUrl, headers } from "./utils.ts";
const data = await fetch(`${baseUrl}/core/info`, {
  headers,
}).then((r) => r.json());

// if this request fails im sure itll be noticed elsewere lol

Deno.stdout.write(new TextEncoder().encode(`${data.data.port}`));
