#!/usr/bin/env node

const args = process.argv.slice(2);

function getArg(flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    return true;
  }
  return value;
}

function ensureBaseUrl() {
  const fallback = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? "";
  const value = getArg("--base", fallback);
  if (typeof value !== "string" || value.trim() === "") {
    console.error("Backend base URL is required. Pass --base or set NEXT_PUBLIC_BACKEND_URL.");
    process.exit(1);
  }
  return value.replace(/\/$/, "");
}

function createHeaders(apiKey) {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  });
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  }
  return headers;
}

function uniqueName(base) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

async function sendRequest(label, url, body, headers) {
  console.log(`\n=== ${label} ===`);
  console.log("Request payload:");
  console.log(JSON.stringify(body, null, 2));
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (responseText) {
      try {
        const json = JSON.parse(responseText);
        console.log("Response JSON:");
        console.log(JSON.stringify(json, null, 2));
      } catch {
        console.log("Response text:");
        console.log(responseText);
      }
    } else {
      console.log("<empty response body>");
    }
  } catch (error) {
    console.error("Request failed:");
    console.error(error);
  }
}

async function main() {
  const baseUrl = ensureBaseUrl();
  const apiKeyArg = getArg("--api-key", process.env.X_API_KEY ?? process.env.API_KEY ?? null);
  const nameArg = getArg("--name", null);
  const baseName = typeof nameArg === "string" ? nameArg : "probe";
  const targetArg = getArg("--target", "500");
  const whatsappArg = getArg("--whatsapp", null);

  const targetNumber = Number.parseFloat(targetArg);
  if (!Number.isFinite(targetNumber)) {
    console.error(`Invalid --target value: ${targetArg}`);
    process.exit(1);
  }

  const payload = {
    name: uniqueName(baseName),
    target_kwh: targetNumber
  };

  if (typeof whatsappArg === "string" && whatsappArg.trim() !== "") {
    payload.whatsapp_msisdn = whatsappArg;
  }

  const headers = createHeaders(typeof apiKeyArg === "string" ? apiKeyArg : undefined);
  const endpoint = `${baseUrl}/api/v1/simulators`;

  await sendRequest("Simulator payload", endpoint, payload, headers);

  console.log("\nDone. The request above matches the confirmed backend contract.");
}

main().catch((error) => {
  console.error("Probe script crashed:");
  console.error(error);
  process.exit(1);
});
