import { db } from '@skalfa/skalfa-orm'

export async function getUserPermissions(userId: number): Promise<string[]> {
  const roleIds = await db("user_roles").where("user_id", userId).pluck("role_id")

  const query = db("user_permissions").where("user_id", userId)

  if (roleIds.length > 0) {
    query.orWhereIn("user_role_id", roleIds)
  }

  const rows = await query.pluck("permissions")

  return Array.from(
    new Set(
      rows.flatMap((p: any) => p ?? [])
    )
  )
}
