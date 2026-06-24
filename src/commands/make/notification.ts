import path from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";
import { notificationStub } from "../stubs";

// =====================================>
// ## Command: make:notification
// =====================================>
export const makeNotificationCommand = new Command("make:notification")
  .argument("<name>", "Name of notification")
  .description("Create new notification")
  .action((name) => {
    const basePath = path.join(process.cwd(), "src", "outputs", "notifications");
    
    if (!name || name.trim() === "") {
      logger.error("Notification name invalid!");
      process.exit(1);
    }
  
    const filename = conversion.strSlug(name) + ".notification.ts";
  
    const filePath = path.join(basePath, filename);
  
    if (existsSync(filePath)) {
      logger.error("Notification already exists!");
      process.exit(1);
    }

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }
    
    let content = notificationStub;

    content = content.replace(/{{\s*name\s*}}/g, conversion.strCamel(name) || "");

    writeFileSync(filePath, content);
  
    logger.info(`Notification ${filename} created!`);

    process.exit(0);
  });
