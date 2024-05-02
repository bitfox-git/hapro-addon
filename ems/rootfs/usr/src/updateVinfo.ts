import { baseUrl, headers } from "./utils.ts";
import prohome from "./config/prohome.json" with {type:"json"}
const id = Deno.args[0];

const data = await fetch(`${baseUrl}/core/info`, {
  headers,
}).then((r) => r.json());

const body = {
  outdated: data.data.update_available,
  ...data.data,
};

await fetch(`${prohome.admin_api}/home/${id}/vinfo`, {
  method: "patch",
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json",
  }
});
