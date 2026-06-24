import { db } from "@skalfa/skalfa-orm";
import { registry } from "../registry";
import { logger } from "../logger";

export type NotificationPayload = {
  title      :  string;
  body      ?:  string;
  type      ?:  string;
  redirect  ?:  string;
  data      ?:  Record<string, any>;
  userIds    :  number[];
}

export type NotificationCancelPayload = {
  id         :  number;
  userIds    :  number[];
}

export const notification = {
  send: async (payload: NotificationPayload) => {
    const userIds = [...new Set(payload.userIds)];
    if (userIds.length === 0) return;

    try {
      const notificationRecord = await db.transaction(async (trx) => {
        const [n] = await trx('notifications')
          .insert({
            title     :  payload.title,
            body      :  payload.body || "",
            type      :  payload.type || "",
            redirect  :  payload.redirect || "",
            data      :  payload.data ?? {},
          })
          .returning('*');

        await trx('notification_users').insert(
          userIds.map((uid) => ({
            notification_id  :  n.id,
            user_id          :  uid
          }))
        );

        return n;
      });

      emitNotificationSocket(userIds, notificationRecord);
    } catch (err) {
      const em = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to send notification: ${em}`, { error: em });
    }
  },

  cancel: async (payload: NotificationCancelPayload) => {
    try {
      await db('notification_users')
        .where("notification_id", payload.id)
        .whereIn("user_id", payload.userIds)
        .update({ canceled_at:  new Date() });

      emitNotificationSocket(payload.userIds, { id: payload.id, type: "cancel" });
    } catch (err) {
      const em = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to cancel notification: ${em}`, { error: em });
    }
  }
};

function emitNotificationSocket(userIds: number[], notificationRecord: Record<string, any>) {
  const socket = registry.get("socket");
  if (socket) {
    for (const uid of userIds) {
      socket.room(`user:${uid}`).emit('notification:new', { 
        id: notificationRecord.id,
        type: notificationRecord?.type || "send"
      });
    }
  }
}
