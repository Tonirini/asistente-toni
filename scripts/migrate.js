require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

async function connectWithRetry(config, maxAttempts = 10, delayMs = 3000) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const conn = await mariadb.createConnection(config);
      console.log("DB connected.");
      return conn;
    } catch (err) {
      console.log(`DB not ready (attempt ${i}/${maxAttempts}): ${err.message}`);
      if (i === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function migrate() {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await connectWithRetry({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.replace("/", ""),
    connectTimeout: 10000,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      migration_name VARCHAR(255) NOT NULL,
      finished_at DATETIME(3),
      started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory, skipping.");
    await conn.end();
    return;
  }

  const dirs = fs
    .readdirSync(migrationsDir)
    .filter((d) => fs.statSync(path.join(migrationsDir, d)).isDirectory())
    .sort();

  for (const dir of dirs) {
    const sqlFile = path.join(migrationsDir, dir, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    const rows = await conn.query(
      "SELECT id FROM _prisma_migrations WHERE migration_name = ?",
      [dir]
    );
    if (rows.length > 0) {
      console.log(`  Skip: ${dir}`);
      continue;
    }

    console.log(`  Apply: ${dir}`);
    const sql = fs.readFileSync(sqlFile, "utf8");
    const statements = sql
      .split(";")
      .map((s) => s.replace(/--[^\n]*/g, "").trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query(
      "INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (UUID(), '', ?, NOW(3), 1)",
      [dir]
    );
    console.log(`  Done: ${dir}`);
  }

  await conn.end();
  console.log("Migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
