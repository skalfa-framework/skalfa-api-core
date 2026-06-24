import path from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";
import { mailStub } from "../stubs";

// =====================================>
// ## Command: make:mail
// =====================================>
export const makeMailCommand = new Command("make:mail")
  .argument("<name>", "Name of mail")
  .description("Create new mail")
  .action((name) => {
    const basePath = path.join(process.cwd(), "src", "outputs", "mails");
    const templatePath = path.join(process.cwd(), "src", "outputs", "mails", "templates");
    
    if (!name || name.trim() === "") {
      logger.error("Mail name invalid!");
      process.exit(1);
    }
  
    const filename = conversion.strSlug(name) + ".mail.ts";
    const templateName = conversion.strSlug(name) + ".mail.stub";
  
    const filePath = path.join(basePath, filename);
  
    if (existsSync(filePath)) {
      logger.error("Mail already exists!");
      process.exit(1);
    }

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }
    if (!existsSync(templatePath)) {
      mkdirSync(templatePath, { recursive: true });
    }
    
    let content = mailStub;

    content = content
      .replace(/{{\s*name\s*}}/g, conversion.strCamel(name) || "")
      .replace(/{{\s*title\s*}}/g, conversion.strPascal(name, " ") || "");

    writeFileSync(filePath, content);
    writeFileSync(path.join(templatePath, templateName), "");
  
    logger.info(`Mail ${filename} created!`);

    process.exit(0);
  });
