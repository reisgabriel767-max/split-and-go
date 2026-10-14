import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface Database {
  query<T>(sql: string, values?: unknown[]): Promise<T[]>;
  transaction<T>(callback: (db: Database) => Promise<T>): Promise<T>;
}

function embedded(pg: PGlite): Database {
  return {
    async query<T>(sql: string, values: unknown[] = []) {
      return (await pg.query<T>(sql, values)).rows;
    },
    async transaction<T>(callback: (db: Database) => Promise<T>) {
      return pg.transaction(async (tx) =>
        callback({
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
    });
    db = {
      async query<T>(sql: string, values: unknown[] = []) {
        return (await pool.query(sql, values)).rows as T[];
      },
      async transaction<T>(callback: (db: Database) => Promise<T>) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await callback({
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
  const schema = await readFile(
    path.join(process.cwd(), "db", "001_initial.sql"),
    "utf8",
  );
  // The first slice has one idempotent schema; versioned migrations follow when it evolves.
  await db.transaction(async (tx) => {
    for (const statement of schema.split(";").filter((part) => part.trim()))
      await tx.query(statement);
  });
  return db;
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
