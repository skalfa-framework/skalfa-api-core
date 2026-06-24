import fs from "fs";
import path from "path";
import { exec, execSync } from "child_process";
import { Command } from "commander";
import { logger } from "@utils";

// =====================================>
// ## Command: barrels (run once)
// =====================================>
export const barrelsCommand = new Command("barrels")
  .description("Generate barrels auto-imports using barrelsby")
  .action(() => {
    const rootDir = process.cwd();
    const configPath = path.join(rootDir, "barrels.json");

    if (!fs.existsSync(configPath)) {
      logger.error("barrels.json config file not found at project root");
      process.exit(1);
    }

    logger.info("Generating barrels...");
    try {
      execSync("bunx barrelsby -c barrels.json", { cwd: rootDir, stdio: "inherit" });
      logger.info("Barrels successfully generated!");
      process.exit(0);
    } catch (err) {
      logger.error(`Failed to generate barrels: ${err}`);
      process.exit(1);
    }
  });

// =====================================>
// ## Command: watch:barrels (file watcher)
// =====================================>
export const watchBarrelsCommand = new Command("watch:barrels")
  .description("Watch directories and update barrels automatically on file changes")
  .action(async () => {
    const rootDir = process.cwd();
    const configPath = path.join(rootDir, "barrels.json");

    if (!fs.existsSync(configPath)) {
      logger.error("barrels.json config file not found at project root");
      process.exit(1);
    }

    let config: any = {};
    try {
      const configText = fs.readFileSync(configPath, "utf8");
      config = JSON.parse(configText);
    } catch (err) {
      logger.error(`Failed to parse barrels.json: ${err}`);
      process.exit(1);
    }

    const directories: string[] = Array.isArray(config.directory) ? config.directory : [config.directory];

    // Run barrels once at startup
    logger.info("Initializing barrels generation...");
    try {
      execSync("bunx barrelsby -c barrels.json", { cwd: rootDir });
    } catch {}

    directories.forEach((dir) => {
      const absoluteDir = path.join(rootDir, dir);

      if (!fs.existsSync(absoluteDir)) {
        logger.error(`Barrels error: ${absoluteDir} directory not found`);
        return;
      }

      fs.watch(absoluteDir, { recursive: true }, (_, filename) => {
        if (filename && filename.endsWith(".ts") && filename !== "index.ts") {
          exec("bunx barrelsby -c barrels.json", { cwd: rootDir }, (error) => {
            if (error) {
              logger.error(`Failed to update barrels for ${dir}: ${error.message}`);
            } else {
              logger.info(`Barrels updated: ${path.join(dir, "index.ts")}`);
            }
          });
        }
      });
    });

    logger.start("Barrels watcher running for: " + directories.join(", "));
  });
