import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import ts from "typescript";

test("domain and application imports do not cross into HTTP, React or persistence", async () => {
  const files = [
    ...["money", "fx", "settlement", "types", "limits"].map(
      (name) => `src/lib/${name}.ts`,
    ),
    ...(await readdir("src/application"))
      .filter((file) => file.endsWith(".ts"))
      .map((file) => `src/application/${file}`),
  ];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      await readFile(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue;
      const dependency = statement.moduleSpecifier.text;
      assert.doesNotMatch(
        dependency,
        /^(next(?:\/|$)|react(?:\/|$)|pg$|@electric-sql\/|node:)/,
        `${file}: ${dependency}`,
      );
      assert.doesNotMatch(
        dependency,
        /(?:infrastructure|presentation|components|hooks|lib\/db)/,
        `${file}: ${dependency}`,
      );
    }
  }
});
