import path from "path";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";
import { basicSeederStub } from "../stubs";

// =====================================>
// ## Command: make:seeder
// =====================================>
export const makeSeederCommand = new Command("make:seeder")
  .argument("<name>", "Name of seeder")
  .option("-m, --model <model>", "Attach model to controller")
  .description("Buat seeder baru")
  .action((name, options) => {
    makeSeeder(name, options.model);
    process.exit(0);
  });

export const makeSeeder = (seederName: string, model?: string) => {
  const name = conversion.strPascal(seederName) + "Seeder";
  const filename = conversion.strSlug(seederName) + ".seeder.ts";
  const modelName = model || conversion.strPascal(seederName);

  const dir = path.join(process.cwd(), "src", "database", "seeders");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  
  let content = basicSeederStub;
      
  content = content
    .replace(/{{\s*name\s*}}/g, name || "")
    .replace(/{{\s*model\s*}}/g, modelName || "");

  writeFileSync(filePath, content, { flag: "w" });

  logger.info(`Seeder ${name} created`);
};
