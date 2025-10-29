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

function formatTarget(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid --target value: ${value}`);
  }
  const asString = numeric.toString();
  return asString.includes(".") ? asString : `${asString}.0`;
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

  const flatName = uniqueName(`${baseName}-flat`);
  const nestedName = uniqueName(`${baseName}-nested`);

  const targetNumber = Number.parseFloat(targetArg);
  if (!Number.isFinite(targetNumber)) {
    console.error(`Invalid --target value: ${targetArg}`);
    process.exit(1);
  }

  const nestedPayload = {
    simulator: {
      name: nestedName,
      target_kwh: formatTarget(targetNumber)
    }
  };

  const flatPayload = {
    name: flatName,
    target_kwh: targetNumber
  };

  if (typeof whatsappArg === "string" && whatsappArg.trim() !== "") {
    nestedPayload.simulator.whatsapp_msisdn = whatsappArg;
    flatPayload.whatsapp_msisdn = whatsappArg;
  }

  const headers = createHeaders(typeof apiKeyArg === "string" ? apiKeyArg : undefined);
  const endpoint = `${baseUrl}/api/v1/simulators`;

  await sendRequest("Nested simulator payload", endpoint, nestedPayload, headers);
  await sendRequest("Flat simulator payload", endpoint, flatPayload, headers);

  console.log("\nDone. Compare the responses above to determine which payload shape your backend expects.");
}

main().catch((error) => {
  console.error("Probe script crashed:");
  console.error(error);
  process.exit(1);
});
