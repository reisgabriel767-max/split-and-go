import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "pg";

const external = process.env.SPLITGO_TEST_DATABASE_URL;
if (!external) {
  console.error(
    "Set SPLITGO_TEST_DATABASE_URL before running the production smoke test.",
  );
  process.exit(1);
}
const port = Number(process.env.SPLITGO_SMOKE_PORT ?? 3100);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid smoke-test port.");
const base = `http://127.0.0.1:${port}`;
const schema = `splitgo_smoke_${randomUUID().replaceAll("-", "")}`;
const admin = new Client({ connectionString: external });
let child;
let created = false;
let serverError;
let serverExited = false;
let output = "";

async function post(value) {
  const response = await fetch(`${base}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(value),
  });
  const body = await response.json();
  assert.equal(response.status, 201, body.error);
  return body;
}
async function load() {
  const response = await fetch(`${base}/api/groups`);
  assert.equal(response.status, 200);
  return response.json();
}

try {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(
        new Error(`Port ${port} is in use; choose another SPLITGO_SMOKE_PORT.`),
      ),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  const url = new URL(external);
  url.searchParams.set("options", `-csearch_path=${schema}`);
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: url.toString(),
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.on("error", (error) => {
    serverError = error;
  });
  child.on("exit", () => {
    serverExited = true;
  });
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      output = (output + chunk.toString()).slice(-8000);
    });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverError) throw serverError;
    if (serverExited)
      throw new Error(`Production server exited before readiness. ${output}`);
    try {
      const response = await fetch(`${base}/api/groups`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok && !serverExited) {
        ready = true;
        break;
      }
    } catch {
      /* Startup is bounded by the retry count. */
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`Production server was not ready. ${output}`);
  const html = await fetch(base);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /Split/);
  assert.equal(
    (await load()).groups.length,
    0,
    "Smoke-test database must be isolated and empty.",
  );
  const { id: groupId } = await post({
    action: "group",
    name: "Production smoke",
    currency: "BRL",
    category: "trip",
    members: ["Ana", "Bruno", "Carla"],
  });
  const members = (await load()).members.filter(
    (member) => member.group_id === groupId,
  );
  const ids = members.map((member) => member.id);
  const expense = {
    action: "expense",
    groupId,
    payerId: ids[0],
    spentOn: "2026-10-14",
    memberIds: ids,
  };
  await post({ ...expense, description: "Equal", amount: 1000 });
  await post({
    ...expense,
    description: "Percentage",
    amount: 1001,
    split: {
      mode: "percentage",
      allocations: ids.map((memberId, index) => ({
        memberId,
        value: [5000, 3000, 2000][index],
      })),
    },
  });
  const { id: foreignId } = await post({
    ...expense,
    description: "Foreign fixed",
    amount: 1001,
    currency: "USD",
    exchangeRate: "5.25",
    split: {
      mode: "fixed",
      allocations: ids.map((memberId, index) => ({
        memberId,
        value: [3000, 2255, 0][index],
      })),
    },
  });
  const saved = await load();
  assert.equal(saved.expenses.length, 3);
  assert.equal(
    saved.expenses.find((expense) => expense.id === foreignId).amount,
    5255,
  );
  for (const row of saved.expenses)
    assert.equal(
      saved.shares
        .filter((share) => share.expense_id === row.id)
        .reduce((sum, share) => sum + share.amount, 0),
      row.amount,
    );
  const invalid = await fetch(`${base}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      ...expense,
      description: "Invalid",
      amount: 1000,
      currency: "USD",
      exchangeRate: "0",
    }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await load()).expenses.length, 3);
  console.log(
    "Production HTTP smoke passed: page, groups, three splits, currency history, persistence and invalid-input rejection.",
  );
} finally {
  if (child && !serverExited) {
    const ended = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await ended;
  }
  if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.end();
}
