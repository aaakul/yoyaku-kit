import dotenv from "dotenv";
import postgres from "postgres";
import { runInitPipeline } from "./init";

dotenv.config();

async function runReset() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL environment variable is not defined.");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("Resetting database (dropping public schema)...");
  console.log("==================================================");

  const client = postgres(url, { max: 1 });

  try {
    await client.unsafe(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log("Public schema dropped and recreated successfully.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to reset schema:", message);
    await client.end();
    process.exit(1);
  } finally {
    await client.end();
  }

  // Run the initialization pipeline to apply extensions, migrations, constraints, and seed data
  await runInitPipeline();
}

runReset().catch((err) => {
  console.error("Unhandled error during database reset:", err);
  process.exit(1);
});
