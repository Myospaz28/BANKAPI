import db from "../database/db.js";

/**
 * Close user session and store logout reason
 * @param {number} sessionLogId
 * @param {string} remark
 */
export const closeUserSession = async (sessionLogId, remark) => {
  try {
    if (!sessionLogId) return;

    await db.query(
      `UPDATE user_session_logs
       SET logout_time = NOW(),
           remark = ?
       WHERE u_log_id = ?
         AND logout_time IS NULL`,
      [remark, sessionLogId]
    );
  } catch (err) {
    console.error("Session close error:", err);
  }
};