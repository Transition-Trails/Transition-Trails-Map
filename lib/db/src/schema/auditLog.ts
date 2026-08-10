import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * trail_os_audit_log
 *
 * Records sign-in events and (in a future task) impersonation events for
 * every Trail OS user. Written on every successful authentication — both
 * the Google SSO path (staff / homebase) and the learner login path.
 *
 * event_type values:
 *   login               — successful sign-in (either surface)
 *   impersonation_start — superadmin began viewing as another user
 *   impersonation_action — write action taken while impersonating
 *   impersonation_end   — superadmin exited the impersonation session
 */
export const trailOsAuditLogTable = pgTable("trail_os_audit_log", {
  id:          serial("id").primaryKey(),
  eventType:   text("event_type").notNull(),   // 'login' | 'impersonation_*'
  actorEmail:  text("actor_email").notNull(),  // who performed the action
  targetEmail: text("target_email"),           // for impersonation — the viewed user
  audience:    text("audience"),               // 'learner'|'coach'|'volunteer'|'team'|null (staff)
  ipAddress:   text("ip_address"),
  metadata:    jsonb("metadata"),              // arbitrary extra context
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export type AuditLogRow    = typeof trailOsAuditLogTable.$inferSelect;
export type InsertAuditLog = typeof trailOsAuditLogTable.$inferInsert;
