import fs from "node:fs";
import path from "node:path";
import { client } from "./drizzle";

async function main() {
  console.log("Applying PostgreSQL GiST range exclusion constraint...");
  const sqlContent = fs.readFileSync(
    path.join(process.cwd(), "lib", "db", "migrate-gist.sql"),
    "utf-8",
  );

  try {
    await client.unsafe(sqlContent);
    console.log("GiST exclusion constraint migration successful.");
  } catch (error) {
    console.error("GiST migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
