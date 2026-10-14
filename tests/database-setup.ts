import { before, after } from "node:test";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

export function useTestDatabase(label: string) {
  Object.assign(process.env, { NODE_ENV: "test" });
  const external = process.env.SPLITGO_TEST_DATABASE_URL;
  if (!external) {
    delete process.env.DATABASE_URL;
    return;
  }
  if (!/^[a-z]+$/.test(label)) throw new Error("Invalid test database label.");
  const schema = `splitgo_test_${label}_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(external);
  url.searchParams.set("options", `-csearch_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
  async function execute(sql: string) {
    const client = new Client({ connectionString: external });
    try {
      await client.connect();
      await client.query(sql);
    } finally {
      await client.end();
    }
  }
  before(async () => {
    await execute(`CREATE SCHEMA "${schema}"`);
  });
  after(async () => {
    await execute(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  });
}
