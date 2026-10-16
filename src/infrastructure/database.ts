import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface Database {
  exec(sql: string): Promise<void>;
  query<T>(sql: string, values?: unknown[]): Promise<T[]>;
  transaction<T>(callback: (db: Database) => Promise<T>): Promise<T>;
}

function embedded(pg: PGlite): Database {
  return {
    async exec(sql: string) {
      await pg.exec(sql);
    },
    async query<T>(sql: string, values: unknown[] = []) {
      return (await pg.query<T>(sql, values)).rows;
    },
    async transaction<T>(callback: (db: Database) => Promise<T>) {
      return pg.transaction(async (tx) =>
        callback({
          async exec(sql: string) {
            await tx.exec(sql);
          },
          async query<R>(sql: string, values: unknown[] = []) {
            return (await tx.query<R>(sql, values)).rows;
          },
          transaction: async () => {
            throw new Error("Nested transactions are not supported.");
          },
        }),
      );
    },
  };
}

async function connect(): Promise<Database> {
  let db: Database;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      allowExitOnIdle: process.env.NODE_ENV === "test",
    });
    db = {
      async exec(sql: string) {
        await pool.query(sql);
      },
      async query<T>(sql: string, values: unknown[] = []) {
        return (await pool.query(sql, values)).rows as T[];
      },
      async transaction<T>(callback: (db: Database) => Promise<T>) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await callback({
            async exec(sql: string) {
              await client.query(sql);
            },
            async query<R>(sql: string, values: unknown[] = []) {
              return (await client.query(sql, values)).rows as R[];
            },
            transaction: async () => {
              throw new Error("Nested transactions are not supported.");
            },
          });
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
  } else {
    if (process.env.NODE_ENV === "production")
      throw new Error("DATABASE_URL is required in production.");
    if (process.env.NODE_ENV !== "test")
      await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
    const pg = new PGlite(
      process.env.NODE_ENV === "test"
        ? undefined
        : path.join(process.cwd(), ".data", "postgres"),
    );
    await pg.waitReady;
    db = embedded(pg);
  }
  await migrate(db);
  return db;
}

export async function migrate(db: Database) {
  const directory = path.join(process.cwd(), "db");
  const files = (await readdir(directory))
    .filter((file) => /^\d{3}_[a-z_]+\.sql$/.test(file))
    .sort();
  await db.transaction(async (tx) => {
    await tx.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)",
    );
    await tx.exec("LOCK TABLE schema_migrations IN EXCLUSIVE MODE");
    const applied = new Set(
      (
        await tx.query<{ version: string }>(
          "SELECT version FROM schema_migrations",
        )
      ).map((row) => row.version),
    );
    for (const file of files) {
      if (applied.has(file)) continue;
      await tx.exec(await readFile(path.join(directory, file), "utf8"));
      await tx.query("INSERT INTO schema_migrations (version) VALUES ($1)", [
        file,
      ]);
    }
  });
}

const state = globalThis as typeof globalThis & {
  splitgoDb?: Promise<Database>;
};
export function database() {
  state.splitgoDb ??= connect().catch((error) => {
    state.splitgoDb = undefined;
    throw error;
  });
  return state.splitgoDb;
}
