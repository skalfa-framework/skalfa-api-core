import fs from "fs";
import path from "path";
import { db } from "@skalfa/skalfa-orm";



// ===================================>
// ## Upload file
// ===================================>
export async function uploadFile(
  file: File,
  folder = "uploads",
  options?: {
    disk?: "public" | "private";
    owner_id?: number;
    permissions?: { user_id?: number; role_id?: number }[];
  }
): Promise<string> {
  const disk = options?.disk ?? "public";

  const dir = path.resolve("storage", disk, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileName = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 18)}${path.extname(file.name).toLowerCase()}`;
  const filePath = path.join(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());

  fs.writeFileSync(filePath, buffer);

  const relativePath = `/${folder}/${fileName}`;

  if (db && options) {
    const isMySql = db.client?.config?.client?.includes?.('mysql')
    let storageId: number

    const insertData = {
      user_id     :  options?.owner_id ?? null,
      disk        :  disk,
      path        :  relativePath,
      filename    :  file.name,
      filetype    :  file.type,
      filesize    :  buffer.length,
      created_at  :  new Date(),
    }

    if (isMySql) {
      const [insertId] = await db("storages").insert(insertData)

      storageId = insertId
    } else {
      const [storage] = await db("storages").insert(insertData).returning(["id"])

      storageId = storage.id
    }

    if (options?.permissions?.length) {
      const permissions = options.permissions.map(p => ({
        storage_id  :  storageId,
        user_id     :  p.user_id ?? null,
        role_id     :  p.role_id ?? null,
        created_at  :  new Date(),
      }));

      await db("storage_permissions").insert(permissions);
    }
  }

  return relativePath;
}

// ==================================>
// ## Delete File
// ==================================>
export async function deleteFile(filePath: string): Promise<boolean> {
  if (fs.existsSync(filePath)) { 
    if (db) {
      const record = await db("storages").where("path", filePath).first();
      
      if (record) {
        await db("storages").where("id", record.id).delete();
        await db("storage_permissions").where("storage_id", record.id).delete();
      }
    }

    fs.unlinkSync(filePath);
    return true; 
  }

  return false;
}
