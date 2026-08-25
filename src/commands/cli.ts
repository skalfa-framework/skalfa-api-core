import fs from "fs";
import path from "path";
import { Command } from "commander";
import { spawn } from "child_process";
import { runBuild as runBuildLang, startDev as startDevLang } from "@skalfa/skalfa-lang/compiler";

import { makeControllerCommand } from "./make/basic-controller";
import { makeSkalfaControllerCommand } from "./make/skalfa-controller";
import { barrelsCommand, watchBarrelsCommand } from "./runner/barrels";
import { makeModelCommand } from "./make/basic-model";
import { makeSeederCommand } from "./make/basic-seeder";
import { makeMigrationCommand } from "./make/basic-migration";
import { makeSkalfaModelCommand } from "./make/skalfa-model";
import { makeBlueprintCommand } from "./make/blueprint";
import { makeResourceCommand } from "./make/resource";
import { migrateCommand, migrateFreshCommand } from "./runner/migration";
import { seederCommand } from "./runner/seeder";
import { blueprintCommand } from "./runner/blueprint/runner";
import { generateDocsCommand } from "./runner/generate-docs";
import { generateErdCommand } from "./runner/generate-erd";
import { makeQueueCommand } from "./make/queue";
import { makeMailCommand } from "./make/mail";
import { makeNotificationCommand } from "./make/notification";
import { makeDaMigrationCommand } from "./make/da-migration";
import { daMigrateCommand, daMigrateFreshCommand } from "./runner/da-migration";

export function runCli() {
  let dependencies: Record<string, string> = {};
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      dependencies = pkg.dependencies || {};
    }
  } catch {}

  const hasMail = !!dependencies["@skalfa/mail"] || !!dependencies["skalfa-mail"];
  const hasNotification = !!dependencies["@skalfa/notification"] || !!dependencies["skalfa-notification"];
  const hasQueue = !!dependencies["@skalfa/queue"] || !!dependencies["@skalfa/redis"] || !!dependencies["skalfa-queue"] || !!dependencies["skalfa-redis"];
  const hasDa = !!dependencies["@skalfa/da"] || !!dependencies["skalfa-da"] || !!dependencies["@clickhouse/client"];

  const program = new Command();
  program.name("skalfa").description("Skalfa-api CLI").version("1.0.0");

  program.addCommand(barrelsCommand);

  program.addCommand(makeControllerCommand);
  program.addCommand(makeSkalfaControllerCommand);
  program.addCommand(watchBarrelsCommand);
  program.addCommand(makeModelCommand);
  program.addCommand(makeMigrationCommand);
  program.addCommand(makeSeederCommand);
  program.addCommand(makeSkalfaModelCommand);
  program.addCommand(makeBlueprintCommand);
  program.addCommand(makeResourceCommand);

  program.addCommand(migrateCommand);
  program.addCommand(migrateFreshCommand);
  program.addCommand(seederCommand);
  program.addCommand(blueprintCommand);
  program.addCommand(generateDocsCommand);
  program.addCommand(generateErdCommand);

  if (hasMail) {
    program.addCommand(makeMailCommand);
  }

  if (hasNotification) {
    program.addCommand(makeNotificationCommand);
  }

  if (hasQueue) {
    program.addCommand(makeQueueCommand);
  }

  if (hasDa) {
    program.addCommand(makeDaMigrationCommand);
    program.addCommand(daMigrateCommand);
    program.addCommand(daMigrateFreshCommand);
  }

  program.addCommand(devCommand);
  program.addCommand(watchCommand);
  program.addCommand(startCommand);
  program.addCommand(testCommand);
  program.addCommand(lintCommand);
  program.addCommand(langCommand);

  program.parse(process.argv);
}

function getPackageManager(): string {
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("bun")) return "bun";
  return "npm";
}

function executeCommand(commandLine: string): void {
  const child = spawn(commandLine, { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}



export const langCommand = new Command("lang")
  .description("Manage and compile type-safe translation resources for @skalfa/lang.")
  .argument("<action>", "action to perform: build, dev")
  .option("-q, --quiet", "Run in quiet mode (suppress verbose logs)")
  .action(async (action: string, options: { quiet?: boolean }) => {
    if (action === "build") {
      const success = await runBuildLang(process.cwd(), false, !!options.quiet);
      if (!success) process.exit(1);
      process.exit(0);
    } else if (action === "dev") {
      await startDevLang(process.cwd(), !!options.quiet);
    } else {
      console.error(`Unknown action "${action}". Use "build" or "dev".`);
      process.exit(1);
    }
  });

export const devCommand = new Command("dev")
  .description("Start development server")
  .action(() => {
    const pm = getPackageManager();
    executeCommand(`concurrently --raw "${pm} run watch" "${pm} run skalfa watch:barrels" "${pm} run skalfa lang dev --quiet"`);
  });

export const watchCommand = new Command("watch")
  .description("Start app watcher")
  .action(() => {
    executeCommand("bun run --watch app/app.ts");
  });

export const startCommand = new Command("start")
  .description("Start server")
  .action(() => {
    executeCommand("bun run app/app.ts");
  });

export const testCommand = new Command("test")
  .description("Run typescript compiler check")
  .action(() => {
    const pm = getPackageManager();
    executeCommand(pm === "bun" ? "bun tsc --noEmit" : "tsc --noEmit");
  });

export const lintCommand = new Command("lint")
  .description("Run eslint check")
  .action(() => {
    const pm = getPackageManager();
    executeCommand(pm === "bun" ? "bunx eslint app/* database/*" : "eslint app/* database/*");
  });
