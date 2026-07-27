import crypto from 'crypto'
import { db } from '@skalfa/skalfa-orm'

export async function verifyUserMailToken(userId: number, token: string) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const record = await db.table("user_mail_tokens").where("user_id", userId).whereNull("used_at").orderBy("id", "desc").first();
  if (!record) return false

  if (record.token !== hashedToken) return false;

  const createdAt = new Date(record.created_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

  if (diffMinutes > 10) return false;

  return true;
}
