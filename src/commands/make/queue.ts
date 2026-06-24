import path from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";
import { queueStub } from "../stubs";

// =====================================>
// ## Command: make:queue
// =====================================>
export const makeQueueCommand = new Command("make:queue")
  .argument("<name>", "Name of queue")
  .description("Create new queue")
  .action((name) => {
    const basePath = path.join(process.cwd(), "src", "jobs", "queues");
    
    if (!name || name.trim() === "") {
      logger.error("Queue name invalid!");
      process.exit(1);
    }
  
    const filename = conversion.strSlug(name) + ".queue.worker.ts";
  
    const filePath = path.join(basePath, filename);
  
    if (existsSync(filePath)) {
      logger.error("Queue already exists!");
      process.exit(1);
    }

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }
    
    let content = queueStub;

    content = content
      .replace(/{{\s*name\s*}}/g, conversion.strCamel(name) || "")
      .replace(/{{\s*worker_name\s*}}/g, conversion.strSlug(name, " ") || "");

    writeFileSync(filePath, content);
  
    logger.info(`Queue ${filename} created!`);

    process.exit(0);
  });
