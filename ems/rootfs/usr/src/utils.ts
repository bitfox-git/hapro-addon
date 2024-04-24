export const headers = {
  Authorization: `Bearer ${Deno.env.get("SUPERVISOR_TOKEN")}`,
};

export const baseUrl = "http://supervisor";
