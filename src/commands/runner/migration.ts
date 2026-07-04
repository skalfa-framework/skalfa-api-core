import fs from "fs";
import path from "path";
import { Knex } from "knex";
import { Command } from "commander";
import { conversion, logger } from "@utils";
import { runSeeder } from "./seeder";

const knex = require("knex");

declare module "knex" {
  namespace Knex {
    interface TableBuilder {
      foreignIdFor(tableName: string, column?: string): Knex.ColumnBuilder;
      softDelete(column?: string): Knex.ColumnBuilder;
    }
  }
}

try {
  knex.TableBuilder.extend("softDelete", function (
    this: any,
    column = `deleted_at`
  ) {
    const table = this as any;
    return table.timestamp(column).index();
  });
} catch (e: any) {
  if (!e.message?.includes("Can't extend")) throw e
}

try {
  knex.TableBuilder.extend("foreignIdFor", function (
    this: any,
    tableName: string,
    column = `${conversion.strSingular(tableName)}_id`
  ) {
    const table = this as any;
    return table.bigInteger(column).unsigned().index();
  });
} catch (e: any) {
  if (!e.message?.includes("Can't extend")) throw e
}


// =====================================>
// ## Command: migrate
// =====================================>
export const migrateCommand = new Command("migrate")
  .description("Run all migration")
  .option("--seed", "Run seeder after migrate")
  .action(async (options) => {
    await ensureDatabaseExists(process.env.DB_DATABASE || "db_elysia_light");

    const { db } = await import("@skalfa/skalfa-orm");

    if (!db) {
      logger.error("Database connection (db) is not available. Ensure @skalfa/skalfa-orm is installed.");
      process.exit(1);
    }

    const hasTable = await db.schema.hasTable("migrations");
    if (!hasTable) {
      await db.schema.createTable("migrations", (table: any) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.timestamp("batch").defaultTo(db.raw("CURRENT_TIMESTAMP"));
      });
    }

    await runMigrationFile();

    if (options.seed) {
      await runSeeder();
    }

    process.exit(0);
  });

// =====================================>
// ## Command: migrate:fresh
// =====================================>
export const migrateFreshCommand = new Command("migrate:fresh")
  .description("Fresh and run all migration")
  .option("--seed", "Run seeder after migrate")
  .action(async (options) => {
    await ensureDatabaseExists(process.env.DB_DATABASE || "db_elysia_light");

    const { db } = await import("@skalfa/skalfa-orm");

    if (!db) {
      logger.error("Database connection (db) is not available. Ensure @skalfa/skalfa-orm is installed.");
      process.exit(1);
    }

    await db.raw(`DROP SCHEMA public CASCADE;`);
    await db.raw(`CREATE SCHEMA public;`);

    logger.info("Database schema has been freshed...");

    await db.schema.createTable("migrations", (table: any) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.timestamp("batch").defaultTo(db.raw("CURRENT_TIMESTAMP"));
    });

    await runMigrationFile();

    if (options.seed) {
      await runSeeder();
    }

    process.exit(0);
  });

// =====================================>
// ## Command: migration helpers
// =====================================>
async function runMigrationFile() {
  const { db } = await import("@skalfa/skalfa-orm");

  if (!db) {
    logger.error("Database connection (db) is not available.");
    return;
  }

  const migrations = await db.table("migrations").select("name");
  const migrated = migrations.map((row: any) => row.name);

  const migrationsDir = fs.existsSync(path.resolve("./database/migrations"))
    ? path.resolve("./database/migrations")
    : path.resolve("./database/migrations");
  if (!fs.existsSync(migrationsDir)) {
    logger.info("No migrations directory found.");
    return;
  }
  const files = getMigrationFiles(migrationsDir).sort((a, b) => a.localeCompare(b));

  let countMigrated = 0;

  logger.info("Running migrations...");

  for (const file of files) {
    const migrationFile = path.relative(migrationsDir, file);

    if (migrated.includes(migrationFile)) continue;

    const mod = await import(file);

    if (mod.up) {
      await mod.up(db);
      await db.table("migrations").insert({ name: migrationFile });
      logger.info(`Migrated: ${migrationFile}`);
    }

    countMigrated++;
  }

  if (countMigrated > 0) {
    logger.info(`Success run all migration!`);
  } else {
    logger.info(`Nothing to migrate!`);
  }
}

function getMigrationFiles(dir: string, baseDir = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(getMigrationFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function ensureDatabaseExists(databaseName: string) {
  const driver = (process.env.DB_CONNECTION || "pg").toLowerCase();

  switch (driver) {
    case "pg":
    case "pgsql": {
      const tempDb = knex({
        client: "pg",
        connection: {
          host: process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.DB_PORT) || 5432,
          user: process.env.DB_USERNAME || "postgres",
          password: process.env.DB_PASSWORD || "password",
          database: "postgres",
        },
      });

      try {
        const result = await tempDb
          .select("datname")
          .from("pg_database")
          .where("datname", databaseName)
          .first();

        if (!result) {
          logger.info(`Database ${databaseName} not found. Create new database...`);
          await tempDb.raw(`CREATE DATABASE "${databaseName}"`);
          logger.info(`Database ${databaseName} successfully created.`);
        }
      } catch (err) {
        logger.error(`Check or create database error: ${err}`);
      } finally {
        await tempDb.destroy();
      }

      break;
    }

    case "mysql":
    case "mysql2": {
      const tempDb = knex({
        client: "mysql2",
        connection: {
          host: process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.DB_PORT) || 3306,
          user: process.env.DB_USERNAME || "root",
          password: process.env.DB_PASSWORD || "",
        },
      });

      try {
        const [rows]: any = await tempDb.raw(
          `SHOW DATABASES LIKE ?`,
          [databaseName]
        );

        if (!rows || rows.length === 0) {
          logger.info(`Database ${databaseName} not found. Create new database...`);
          await tempDb.raw(`CREATE DATABASE \`${databaseName}\``);
          logger.info(`Database ${databaseName} successfully created.`);
        }
      } catch (err) {
        logger.error(`Check or create database error: ${err}`);
      } finally {
        await tempDb.destroy();
      }

      break;
    }

    default:
      throw new Error(`Driver ${driver} belum didukung oleh ensureDatabaseExists().`);
  }
}
