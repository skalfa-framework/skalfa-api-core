import { readFileSync, existsSync } from "fs";
import { join } from "path";
import nodemailer, { SentMessageInfo } from "nodemailer";
import { logger } from "@utils";



export interface SendMailOptions {
  to            :  string;
  subject       :  string;
  content      ?:  string;
  text         ?:  string;
  attachments  ?:  {
    filename    :  string;
    path        :  string;
  }[];
}



// =====================================>
// ## Mail: Send mail
// =====================================>
export async function sendMail(options: {
  to            :  string;
  subject       :  string;
  text         ?:  string;
  content      ?:  string;
  attachments  ?:  { filename: string; path: string }[];
}) {
  const transporter = nodemailer.createTransport({
    host    :  process.env.MAIL_HOST,
    port    :  Number(process.env.MAIL_PORT),
    secure  :  Number(process.env.MAIL_PORT) === 465,
    auth    :  {
      user  :  process.env.MAIL_USERNAME,
      pass  :  process.env.MAIL_PASSWORD,
    },
  });

  const info = (await transporter.sendMail({
    from         :  `${process.env.MAIL_FROM_NAME || process.env.APP_NAME} <${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME}>`,
    to           :  options.to,
    subject      :  options.subject,
    text         :  options.text,
    html         :  options.content,
    attachments  :  options.attachments,
  })) as SentMessageInfo;

  logger.info(`Email sent successfully: ${info.messageId}`)
  return info;
}



// =====================================>
// ## Mail: Render mail template
// =====================================>
export function renderMailTemplate(
  template: string,
  options: Record<string, string>,
  customDir?: string
) {
  const appTemplateDir = join(process.cwd(), "app", "outputs", "mails", "templates");
  const coreTemplateDir = join(import.meta.dir, "./../outputs/mails/templates");

  let templateDir = customDir;
  if (!templateDir) {
    if (existsSync(join(appTemplateDir, `${template}.mail.stub`))) {
      templateDir = appTemplateDir;
    } else if (existsSync(join(coreTemplateDir, `${template}.mail.stub`))) {
      templateDir = coreTemplateDir;
    } else {
      templateDir = appTemplateDir;
    }
  }

  const contentPath = join(templateDir, `${template}.mail.stub`);
  if (!existsSync(contentPath)) {
    throw new Error(`Mail template '${template}.mail.stub' not found at: ${contentPath}`);
  }

  let content = readFileSync(contentPath, "utf-8");

  for (const [key, value] of Object.entries(options)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    content = content.replace(regex, value);
  }

  const layoutPath = join(templateDir, "layout.mail.stub");
  let layout = existsSync(layoutPath) ? readFileSync(layoutPath, "utf-8") : "{{content}}";

  const globalVars = {
    ...options,
    date      :  "20-10-2025",
    app_name  :  process.env.APP_NAME || "",
  };

  for (const [key, value] of Object.entries(globalVars)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    layout = layout.replace(regex, value);
  }

  layout = layout.replace("{{content}}", content);

  return layout;
}