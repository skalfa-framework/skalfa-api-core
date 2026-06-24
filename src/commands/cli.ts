import fs from "fs";
import path from "path";
import { Command } from "commander";

// Basic commands (always available)
import { makeControllerCommand } from "./make/basic-controller";
import { makeLightControllerCommand } from "./make/light-controller";
import { barrelsCommand, watchBarrelsCommand } from "./runner/barrels";

// ORM commands (optional)
import { makeModelCommand } from "./make/basic-model";
import { makeSeederCommand } from "./make/basic-seeder";
import { makeMigrationCommand } from "./make/basic-migration";
import { makeLightModelCommand } from "./make/light-model";
import { makeBlueprintCommand } from "./make/blueprint";
import { migrateCommand, migrateFreshCommand } from "./runner/migration";
import { seederCommand } from "./runner/seeder";
import { blueprintCommand } from "./runner/blueprint/runner";

// Extension-specific commands
import { makeQueueCommand } from "./make/queue";
import { makeMailCommand } from "./make/mail";
import { makeNotificationCommand } from "./make/notification";
import { makeDaMigrationCommand } from "./make/da-migration";
import { daMigrateCommand, daMigrateFreshCommand } from "./runner/da-migration";

export function runCli() {
  // Read package.json to dynamically detect installed extensions
  let dependencies: Record<string, string> = {};
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      dependencies = pkg.dependencies || {};
    }
  } catch {}

  const hasOrm = !!dependencies["@skalfa/skalfa-orm"];
  const hasMail = !!dependencies["@skalfa/mail"] || !!dependencies["skalfa-mail"];
  const hasNotification = !!dependencies["@skalfa/notification"] || !!dependencies["skalfa-notification"];
  const hasQueue = !!dependencies["@skalfa/queue"] || !!dependencies["@skalfa/redis"] || !!dependencies["skalfa-queue"] || !!dependencies["skalfa-redis"];
  const hasDa = !!dependencies["@skalfa/da"] || !!dependencies["skalfa-da"] || !!dependencies["@clickhouse/client"];

  const program = new Command();
  program.name("skalfa").description("Skalfa Local CLI").version("1.0.0");

  // 1. Add Core / Basic commands
  program.addCommand(makeControllerCommand);
  program.addCommand(makeLightControllerCommand);
  program.addCommand(barrelsCommand);
  program.addCommand(watchBarrelsCommand);

  // 2. Add ORM commands if installed
  if (hasOrm) {
    program.addCommand(makeModelCommand);
    program.addCommand(makeMigrationCommand);
    program.addCommand(makeSeederCommand);
    program.addCommand(makeLightModelCommand);
    program.addCommand(makeBlueprintCommand);
    program.addCommand(migrateCommand);
    program.addCommand(migrateFreshCommand);
    program.addCommand(seederCommand);
    program.addCommand(blueprintCommand);
  }

  // 3. Add Mail commands if installed
  if (hasMail) {
    program.addCommand(makeMailCommand);
  }

  // 4. Add Notification commands if installed
  if (hasNotification) {
    program.addCommand(makeNotificationCommand);
  }

  // 5. Add Queue commands if installed
  if (hasQueue) {
    program.addCommand(makeQueueCommand);
  }

  // 6. Add Data Analytics / OLAP commands if installed
  if (hasDa) {
    program.addCommand(makeDaMigrationCommand);
    program.addCommand(daMigrateCommand);
    program.addCommand(daMigrateFreshCommand);
  }

  program.parse(process.argv);
}
