import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Quick verification script to POST /api/v1/simulators and print the response.
 *
 * Reads NEXT_PUBLIC_BACKEND_URL (or BACKEND_URL) and NEXT_PUBLIC_BACKEND_TOKEN (or BACKEND_TOKEN)
 * from the environment, builds a flat JSON body, and prints status + payload.
 *
 * Run:  npm run verify:create-simulator
 */

const base =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:3000/api/bridge";
const token = process.env.NEXT_PUBLIC_BACKEND_TOKEN || process.env.BACKEND_TOKEN;

async function main() {
  if (!base) {
    console.error("ERROR: NEXT_PUBLIC_BACKEND_URL (or BACKEND_URL) is not set.");
    process.exit(1);
  }
  if (!token) {
    console.error("WARNING: NEXT_PUBLIC_BACKEND_TOKEN (or BACKEND_TOKEN) is not set. Requests may fail with 401.");
  }

  const name = `Verify Bot ${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const body = { name, target_kwh: 120 };

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers["x-api-key"] = token;

  const url = `${base.replace(/\/$/, "")}/api/v1/simulators`;
  console.log("POST", url);
  console.log("Body", body);

  const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await resp.text();

  console.log("Status:", resp.status, resp.statusText);
  if (text) {
    try {
      const json = JSON.parse(text);
      console.log("JSON:", JSON.stringify(json, null, 2));
    } catch {
      console.log("Text:", text);
    }
  } else {
    console.log("No response body.");
  }
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});