import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

async function ensureEnvFile(): Promise<boolean> {
  const envPath = path.join(process.cwd(), ".env");
  const examplePath = path.join(process.cwd(), ".env.example");

  try {
    await fs.access(envPath);
    return false; // .env already exists
  } catch {
    // .env does not exist, create from .env.example
    console.log("No .env configuration file detected. Generating from .env.example...");
    let content = "";
    try {
      content = await fs.readFile(examplePath, "utf-8");
    } catch {
      content = [
        'POSTGRES_URL="postgres://postgres:postgres@localhost:5432/yoyaku_db"',
        'AUTH_SECRET="REPLACE_ME"',
        'BASE_URL="http://localhost:3000"',
        'DEFAULT_RESTAURANT_SLUG="kyoto-shabu"',
        'NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG="kyoto-shabu"',
      ].join("\n");
    }

    const newSecret = crypto.randomBytes(32).toString("hex");
    content = content.replace("your-super-secret-auth-key-at-least-32-chars-long", newSecret);
    content = content.replace("REPLACE_ME", newSecret);

    await fs.writeFile(envPath, content, "utf-8");
    console.log("Generated .env file with secure AUTH_SECRET.");
    dotenv.config();
    return true;
  }
}

export async function runInitPipeline() {
  console.log("==================================================");
  console.log("Running database initialization pipeline");
  console.log("==================================================");

  // 1. Ensure environment configuration exists
  await ensureEnvFile();

  const { client, db } = await import("./drizzle");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { seed } = await import("./seed");

  // 2. Test database connectivity
  console.log("\n[1/5] Testing PostgreSQL database connectivity...");
  try {
    await client.unsafe("SELECT 1;");
    console.log("PostgreSQL connection successful.");
  } catch (connError) {
    const message = connError instanceof Error ? connError.message : String(connError);
    console.error("\nDatabase connection failed: Unable to connect to PostgreSQL.");
    console.error(`Details: ${message}`);
    console.error("\nHint: Start the local database container with:");
    console.error("   docker compose up -d\n");
    process.exit(1);
  }

  // 3. Enable PostgreSQL extensions
  console.log("\n[2/5] Enabling PostgreSQL extensions (btree_gist)...");
  try {
    await client.unsafe(`
      CREATE EXTENSION IF NOT EXISTS btree_gist;
    `);
    console.log("PostgreSQL extensions ready.");
  } catch (extError) {
    console.error("Failed to enable extensions:", extError);
    process.exit(1);
  }

  // 4. Run schema migrations
  console.log("\n[3/5] Running Drizzle schema migrations...");
  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "lib", "db", "migrations"),
    });
    console.log("Database schema migrations applied successfully.");
  } catch (migError) {
    console.error("Schema migration failed:", migError);
    process.exit(1);
  }

  // 5. Apply PostgreSQL GiST exclusion constraint
  console.log("\n[4/5] Applying PostgreSQL GiST range exclusion constraint...");
  try {
    const gistSql = await fs.readFile(
      path.join(process.cwd(), "lib", "db", "migrate-gist.sql"),
      "utf-8",
    );
    await client.unsafe(gistSql);
    console.log("GiST range exclusion constraint applied successfully.");
  } catch (gistError) {
    console.error("Failed to apply GiST exclusion constraint:", gistError);
    process.exit(1);
  }

  // 6. Seed initial data
  console.log("\n[5/5] Seeding restaurant, tables, business hours, CMS, and admin account...");
  try {
    await seed();
    console.log("Seed data imported successfully.");
  } catch (seedError) {
    console.error("Seed data import failed:", seedError);
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("Database initialization completed successfully.");
  console.log("==================================================");
  console.log("Run the following command to start the development server:");
  console.log("   pnpm dev");
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "12345678";
  console.log(`\nDefault manager account: ${adminEmail}`);
  console.log(`Default password: ${adminPassword}`);
  const demoEmail = process.env.INITIAL_DEMO_EMAIL || "demo@example.com";
  const demoPassword = process.env.INITIAL_DEMO_PASSWORD || "12345678";
  console.log(`Default demo account: ${demoEmail}`);
  console.log(`Demo password: ${demoPassword}\n`);

  await client.end();
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("lib/db/init.ts")) {
  runInitPipeline()
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error("Unhandled exception during initialization pipeline:", err);
      process.exit(1);
    });
}
