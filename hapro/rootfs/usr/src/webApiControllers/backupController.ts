import * as helpers from "./apiHelperService";

async function getBackups() {
  try {
    const response = await helpers.doSupervisorRequest("/backups");
    return new Response(
      JSON.stringify({ StatusCode: 200, data: response.data.backups })
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function getBackupInfo(backupId) {
  try {
    const response = await helpers.doSupervisorRequest(
      `/backups/${backupId}/info`
    );
    const returnObject = {
      slug: response.data.slug,
      date: response.data.date,
      name: response.data.name,
      type: response.data.type,
      protected: response.data.protected,
      compressed: response.data.compressed,
      size: response.data.size,
      content: {
        homeassistant: response.data.homeassistant !== null,
        addons: response.data.addons.map((addon) => addon.slug),
        folders: response.data.folders,
      },
    };
    return new Response(
      JSON.stringify({ StatusCode: 200, data: returnObject })
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function downloadBackup(backupId) {
  try {
    const response = await fetch(
      `http://supervisor/backups/${backupId}/download`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${Bun.env.SUPERVISOR_TOKEN}`,
        },
      }
    );
    console.log(response);
    return response;
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function deleteBackup(backupId) {
  try {
    const response = await helpers.doSupervisorRequest(
      `/backups/${backupId}`,
      "DELETE"
    );
    return new Response(JSON.stringify({ StatusCode: response.result == "ok" ? 200 : response.message == "Backup does not exist" ? 404 : 500, Message: response.message }));
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

export { getBackups, getBackupInfo, downloadBackup, deleteBackup };
