import crypto from 'crypto'
import bcrypt from "bcrypt";
import { db } from '@skalfa/skalfa-orm'
import { TOKEN_PLAIN_LENGTH, AUTH_PERMISSION } from './auth'
import { getUserPermissions, generateAgentId } from './helpers'

export async function createAccessToken(userId: number, req: Request, permission: boolean = true) {
  const plain  =  crypto.randomBytes(TOKEN_PLAIN_LENGTH).toString("hex")
  const hash   =  await bcrypt.hash(plain, 10)
  const agent  =  generateAgentId(req)

  let permissions: string[] = []
  if (AUTH_PERMISSION || permission) {
    permissions = await getUserPermissions(userId)
  }

  const isMySql = db.client?.config?.client?.includes?.('mysql')
  let tokenId: number

  const insertData = {
    user_id      :  userId,
    token        :  hash,
    agent        :  agent,
    permissions  :  JSON.stringify(permissions),
    created_at   :  new Date(),
  }

  if (isMySql) {
    const [insertId] = await db("user_access_tokens").insert(insertData)

    tokenId = insertId
  } else {
    const [row] = await db("user_access_tokens").insert(insertData).returning(["id"])

    tokenId = row.id
  }

  return {
    token    :  `${tokenId}|${plain}`,
    tokenId  :  tokenId,
  }

}
