import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * submitted_cases
 *
 * Local-first case records.  A case is written here the moment the user
 * submits the form (syncStatus='pending'), then the server attempts to
 * create it in Salesforce.  On success the sfCaseId + sfCaseNumber are
 * filled in and syncStatus becomes 'synced'.  On failure syncStatus is
 * 'failed' and syncError contains the reason so a retry can be triggered.
 */
export const submittedCasesTable = pgTable('submitted_cases', {
  id:             serial('id').primaryKey(),

  // ── Salesforce sync ──────────────────────────────────────────────────────
  sfCaseId:       text('sf_case_id'),        // null until successfully synced
  sfCaseNumber:   text('sf_case_number'),
  syncStatus:     text('sync_status').notNull().default('pending'), // pending | synced | failed
  syncError:      text('sync_error'),
  syncedAt:       timestamp('synced_at'),

  // ── Record type ──────────────────────────────────────────────────────────
  recordTypeId:   text('record_type_id'),
  recordTypeName: text('record_type_name'),

  // ── Core fields ──────────────────────────────────────────────────────────
  subject:        text('subject').notNull(),
  description:    text('description'),
  priority:       text('priority').default('Medium'),
  status:         text('status').default('New'),

  // ── Owner / Assignment ───────────────────────────────────────────────────
  // ownerId can be a SF User ID or a Group (queue) ID.
  // ownerType distinguishes the two: 'self' | 'user' | 'queue'
  ownerId:        text('owner_id'),
  ownerName:      text('owner_name'),
  ownerType:      text('owner_type'),  // 'self' | 'queue'

  // ── Contact / Account links ──────────────────────────────────────────────
  contactId:      text('contact_id'),
  contactName:    text('contact_name'),
  accountId:      text('account_id'),
  accountName:    text('account_name'),

  // ── Extra / custom fields ────────────────────────────────────────────────
  // Record-type-specific required fields are stored here as { fieldApiName: value }.
  customFields:   jsonb('custom_fields'),

  // ── Audit ────────────────────────────────────────────────────────────────
  createdByEmail: text('created_by_email').notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
});

export type SubmittedCase    = typeof submittedCasesTable.$inferSelect;
export type NewSubmittedCase = typeof submittedCasesTable.$inferInsert;
