import fs from "fs";
import path from "path";
import { Command } from "commander";

interface Column {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
}

interface Relation {
  fromTable: string;
  toTable: string;
  relationType: string;
  label: string;
}

interface TableSchema {
  name: string;
  columns: Column[];
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function parseMigrations(migrationsDir: string): { tables: Map<string, TableSchema>; relations: Relation[] } {
  const files = getAllFiles(migrationsDir);
  const tables = new Map<string, TableSchema>();
  const relations: Relation[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");

    // Match knex.schema.createTable("table_name", (table) => { ... })
    const createTableRegex =
      /knex\.schema\.createTable\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*\{([\s\S]*?)\n\s*\}\)/g;

    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = createTableRegex.exec(content)) !== null) {
      const tableName = tableMatch[1];
      const body = tableMatch[2];

      const columns: Column[] = [];
      const lines = body.split("\n");

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("//") || line.startsWith("/*")) continue;

        // 1. Primary keys / increments
        const incMatch = line.match(/table\.(bigIncrements|increments)\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (incMatch) {
          columns.push({
            name: incMatch[2],
            type: "bigint",
            isPrimaryKey: true,
          });
          continue;
        }

        // 2. foreignIdFor("target_table", "custom_column"?)
        const foreignIdMatch = line.match(
          /table\.foreignIdFor\(\s*['"`]([^'"`]+)['"`](?:\s*,\s*['"`]([^'"`]+)['"`])?\s*\)/
        );
        if (foreignIdMatch) {
          const targetTable = foreignIdMatch[1];
          const colName =
            foreignIdMatch[2] ||
            (targetTable.endsWith("s")
              ? targetTable.slice(0, -1) + "_id"
              : targetTable + "_id");

          columns.push({
            name: colName,
            type: "bigint",
            isForeignKey: true,
          });

          relations.push({
            fromTable: targetTable,
            toTable: tableName,
            relationType: "||--o{",
            label: "references",
          });
          continue;
        }

        // 3. Foreign key via bigInteger with column naming conventions (*_id)
        const bigIntFkMatch = line.match(
          /table\.bigInteger\(\s*['"`]([a-zA-Z0-9_]+_id)['"`]\s*\)/
        );
        if (bigIntFkMatch) {
          const colName = bigIntFkMatch[1];
          const isNullable = line.includes(".nullable()");
          const isUnique = line.includes(".unique()");

          columns.push({
            name: colName,
            type: "bigint",
            isForeignKey: true,
            isUnique,
            isNullable,
          });

          let inferredTarget = colName.replace(/_id$/, "");
          if (inferredTarget === "role") inferredTarget = "user_role";
          const pluralTarget = inferredTarget.endsWith("s") ? inferredTarget : inferredTarget + "s";

          relations.push({
            fromTable: pluralTarget,
            toTable: tableName,
            relationType: "||--o{",
            label: "references",
          });
          continue;
        }

        // 4. timestamps(true, true)
        if (line.includes("table.timestamps(")) {
          columns.push({ name: "created_at", type: "timestamp" });
          columns.push({ name: "updated_at", type: "timestamp" });
          continue;
        }

        // 5. softDelete()
        if (line.includes("table.softDelete(")) {
          columns.push({ name: "deleted_at", type: "timestamp", isNullable: true });
          continue;
        }

        // 6. Generic columns: table.<type>('name', ...)
        const genericMatch = line.match(
          /table\.([a-zA-Z0-9_]+)\(\s*['"`]([^'"`]+)['"`]/
        );
        if (genericMatch) {
          const method = genericMatch[1];
          const colName = genericMatch[2];

          let type = "varchar";
          if (["integer", "tinyint", "smallint", "mediumint"].includes(method)) type = "int";
          else if (["bigInteger", "bigint"].includes(method)) type = "bigint";
          else if (["boolean", "bool"].includes(method)) type = "boolean";
          else if (["json", "jsonb"].includes(method)) type = "json";
          else if (["timestamp", "datetime", "date", "time"].includes(method)) type = "timestamp";
          else if (["text", "longtext", "mediumtext"].includes(method)) type = "text";
          else if (["float", "decimal", "double"].includes(method)) type = "decimal";

          const isUnique = line.includes(".unique()");
          const isNullable = line.includes(".nullable()");
          const isPrimary = line.includes(".primary()");

          columns.push({
            name: colName,
            type,
            isPrimaryKey: isPrimary,
            isUnique,
            isNullable,
          });
        }
      }

      tables.set(tableName, { name: tableName, columns });
    }
  }

  return { tables, relations };
}

function generateMermaid(migrationsDir: string): string {
  const { tables, relations } = parseMigrations(migrationsDir);
  const lines: string[] = ["erDiagram"];

  // Deduplicate relations
  const uniqueRelations = new Set<string>();
  for (const rel of relations) {
    const key = `${rel.fromTable}-${rel.toTable}`;
    if (!uniqueRelations.has(key)) {
      uniqueRelations.add(key);
      lines.push(`    ${rel.fromTable} ${rel.relationType} ${rel.toTable} : "${rel.label}"`);
    }
  }

  lines.push("");

  // Output tables
  for (const [tableName, schema] of tables) {
    lines.push(`    ${tableName} {`);
    for (const col of schema.columns) {
      let constraint = "";
      if (col.isPrimaryKey) constraint = "PK";
      else if (col.isForeignKey && col.isUnique) constraint = "FK, UK";
      else if (col.isForeignKey) constraint = "FK";
      else if (col.isUnique) constraint = "UK";

      const constraintStr = constraint ? ` ${constraint}` : "";
      lines.push(`        ${col.type} ${col.name}${constraintStr}`);
    }
    lines.push(`    }`);
    lines.push("");
  }

  return lines.join("\n");
}

export const generateErdCommand = new Command("generate:erd")
  .description("Generate Mermaid ERD (.mmd) from Knex migration files")
  .option("-o, --output <path>", "Output file path (default: docs/erd.mmd)", "docs/erd.mmd")
  .action((options: { output: string }) => {
    const projectRoot = process.cwd();
    const migrationsDir = path.join(projectRoot, "database", "migrations");
    const outputFile = path.isAbsolute(options.output)
      ? options.output
      : path.join(projectRoot, options.output);

    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🔍 Parsing migrations in: ${migrationsDir}`);
    const mermaidContent = generateMermaid(migrationsDir);
    fs.writeFileSync(outputFile, mermaidContent, "utf-8");

    console.log(`🎉 Mermaid ERD successfully generated at: ${outputFile}`);
  });
