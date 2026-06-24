import fs from "fs";
import path from "path";
import { Command } from "commander";
import { logger } from "@utils";

// =====================================>
// ## Command: seeder
// =====================================>
export const seederCommand = new Command("seeder")
  .description("Run all database seeders")
  .action(async () => {
    try {
      await runSeeder();
      process.exit(0);
    } catch (error) {
      logger.error(`Error running seeds: ${error}`);
      process.exit(1);
    }
  });

export const runSeeder = async () => {
  const seedersDir = fs.existsSync(path.join(process.cwd(), "database", "seeders"))
    ? path.join(process.cwd(), "database", "seeders")
    : path.join(process.cwd(), "src", "database", "seeders");
  if (!fs.existsSync(seedersDir)) {
    logger.info("No seeders directory found.");
    return;
  }
  const files = fs.readdirSync(seedersDir).filter(f => f.endsWith(".ts"));

  logger.info("Running seeders...");

  for (const file of files) {
    const seederPath = path.join(seedersDir, file);
    const { default: seeder } = await import(seederPath);

    if (typeof seeder === "function") {
      await seeder();
      logger.info(`Planted: ${file}`);
    }
  }

  logger.info("Success run all seeders!");
};
