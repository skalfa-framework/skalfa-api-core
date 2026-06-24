export * from "./auth";
export * from "./controller";
export * from "./conversion";
export * from "./context";
export * from "./middleware";
export * from "./permission";
export * from "./route";
export * from "./storage";
export * from "./validation";
export * from "./mail";
export * from "./logger";
export * from "./registry";
export * from "./commands/cli";

declare module "knex" {
  namespace Knex {
    interface CreateTableBuilder {
      foreignIdFor(tableName: string, column?: string): Knex.ColumnBuilder;
      softDelete(column?: string): Knex.ColumnBuilder;
    }
  }
}