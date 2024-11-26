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

async function uploadBackup(req) {
  try {
    const backupFile = await req.arrayBuffer();
    const fileName = "backup.tar";
    const blob = new Blob([backupFile], { type: "application/x-tar" });
    const formData = new FormData();
    formData.append("file", blob, fileName);
    const response = await fetch("http://supervisor/backups/new/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Bun.env.SUPERVISOR_TOKEN}`
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload backup: ${response.statusText}`);
    }

    console.log("Backup uploaded successfully");
    return new Response(JSON.stringify({ StatusCode: 200, Message: "Backup uploaded successfully" }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error uploading backup:", error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" }),
      { status: 500 }
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

async function restoreBackup(backupId, backupPassword = null) {
  try {
    const backups = await helpers.doSupervisorRequest("/backups");
    const backup = backups.data.backups.find(backup => backup.slug === backupId);
    if(backup === undefined)
      return new Response(JSON.stringify({ StatusCode: 404, Message: "Backup not found" }));
    if(backup.protected && backupPassword === null)
      return new Response(JSON.stringify({ StatusCode: 401, Message: "Backup is password protected" }));
    console.log(backup);
    if(backup.type === "full") {
      const response = await helpers.doSupervisorRequest(
        `/backups/${backupId}/restore/full`,
        "POST",
        { background: true }
      );
      console.log(response);
      return new Response(JSON.stringify({ StatusCode: 200, Message: "Restore started", Data: response.data.job_id }));
    } else {
      const response = await helpers.doSupervisorRequest(
        `/backups/${backupId}/restore/partial`,
        "POST",
        { background: true, homeassistant: backup.content.homeassistant, addons: backup.content.addons, folders: backup.content.folders }
      );
      console.log(response);
      return new Response(JSON.stringify({ StatusCode: 200, Message: "Restore started", Data: response.data.job_id }));
    }
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

async function backupStatus(jobId) {
  try {
    const response = await helpers.doSupervisorRequest(
      `/jobs/info`
    );
    const job = response.data.jobs.find(job => job.uuid === jobId);
    if(job === undefined)
      return new Response(JSON.stringify({ StatusCode: 404, Message: "Job not found" }));
    if(job.done && job.errors.length > 0)
      return new Response(JSON.stringify({ StatusCode: 500, Message: "Backup failed", Data: job.errors }));
    if(job.done)
      return new Response(JSON.stringify({ StatusCode: 200, Message: "Backup completed" }));
    return new Response(JSON.stringify({ StatusCode: 100, Message: "Backup in progress" }));
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ StatusCode: 500, Message: "Internal Server Error" })
    );
  }
}

export { getBackups, getBackupInfo, downloadBackup, uploadBackup, deleteBackup, restoreBackup, backupStatus };
