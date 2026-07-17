import bcrypt from "bcrypt";
import { db } from '@skalfa/skalfa-orm'
import { registry } from '@utils/registry'
import { AUTH_CACHE, AUTH_CACHE_TTL } from './auth'
import { generateAgentId, getRequestIp } from './helpers'

export async function verifyAccessToken(token: string, req?: Request) {
  if (!token.includes("|")) return null

  const [tokenId, plain]  =  token.split("|", 2)
  const agent             =  req ? generateAgentId(req) : ""
  const ip                =  req ? getRequestIp(req) : ""

  const cacheKey = `auth:token:${tokenId}`

  if (AUTH_CACHE) {
    const redis = registry.get('redis')
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const session = JSON.parse(cached)
        if (session.agent !== agent) return null
        return session
      }
    }
  }

  const tokenRecord = await db("user_access_tokens").where("id", tokenId).first()

  if (!tokenRecord) return null
  if (tokenRecord.agent !== agent) return null

  const valid = await bcrypt.compare(plain, tokenRecord.token)
  if (!valid) return null

  await db("user_access_tokens").where("id", tokenRecord.id).update({ last_used_at: new Date(), last_used_ip: ip })

  const user = await db("users").where("id", tokenRecord.user_id).first()

  if (AUTH_CACHE) {
    const redis = registry.get('redis')
    if (redis) {
      await redis.setex(
        cacheKey,
        AUTH_CACHE_TTL,
        JSON.stringify({
          user         :  user,
          agent        :  tokenRecord.agent,
          permissions  :  tokenRecord.permission,
        })
      )
    }
  }

  return { user, token: tokenRecord, permissions: tokenRecord.permission }
}
