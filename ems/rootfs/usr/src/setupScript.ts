const file = Deno.args[0]; // file to check for

const txt = await Deno.readTextFile(file);

// These checks are easy to bypass but that doesn't matter that much the user probably knows better at that point

if (txt.includes("http: !include ems.yaml")) {
  console.log("HTTP Settings Correct");
} else if (txt.includes("http:")) {
  console.error("HTTP Settings In-Correct");
} else {
  const txt = await Deno.readTextFile(file);
  console.log("HTTP Settings Missing; auto fixing the issue");
  await Deno.writeTextFile(
    file,
    txt + "\nhttp: !include ems.yaml # Added by EMS Addon"
  );
}

if (txt.includes("auth_header: !include auth.yaml")) {
  console.log("Auth Header Correct");
} else if (txt.includes("auth_header:")) {
  console.error("Auth Header In-Correct");
} else {
  const txt = await Deno.readTextFile(file);
  console.log("Auth Header Missing; auto fixing possible");
  await Deno.writeTextFile(
    file,
    txt + "\nauth_header: !include auth.yaml # Added by EMS Addon"
  );
}
