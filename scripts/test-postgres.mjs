import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";

if (!process.env.SPLITGO_TEST_DATABASE_URL) {
  console.error(
    "Set SPLITGO_TEST_DATABASE_URL to an isolated PostgreSQL test instance.",
  );
  process.exit(1);
}
const files = (await readdir("tests"))
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => `tests/${file}`);
const child = spawn(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "--test", ...files],
  { stdio: "inherit", env: process.env },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
