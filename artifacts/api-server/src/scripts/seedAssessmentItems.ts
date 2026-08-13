/**
 * seedAssessmentItems.ts
 *
 * Seeds the 8 Salesforce Admin exam domains and their question banks.
 * Safe to re-run — only inserts if the table is empty (per domain).
 *
 * Run:  pnpm --filter @workspace/api-server exec ts-node -T src/scripts/seedAssessmentItems.ts
 * Or:   called automatically by the assessments route on first use.
 */

import { db } from "@workspace/db";
import { assessmentItemsTable, type InsertAssessmentItem } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";

// ── Domain registry ────────────────────────────────────────────────────────────

export const SF_ADMIN_DOMAINS = [
  { domain: "config-setup",           domainLabel: "Configuration and Setup",               domainWeight: "0.18" },
  { domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: "0.18" },
  { domain: "sales-marketing",        domainLabel: "Sales and Marketing Applications",       domainWeight: "0.12" },
  { domain: "service-support",        domainLabel: "Service and Support Applications",       domainWeight: "0.11" },
  { domain: "productivity",           domainLabel: "Productivity and Collaboration",          domainWeight: "0.07" },
  { domain: "data-analytics",         domainLabel: "Data and Analytics Management",          domainWeight: "0.13" },
  { domain: "workflow-automation",    domainLabel: "Workflow and Process Automation",         domainWeight: "0.15" },
  { domain: "security-access",        domainLabel: "Security and Access Management",         domainWeight: "0.06" },
] as const;

// ── Item bank ──────────────────────────────────────────────────────────────────

const ITEMS: Omit<InsertAssessmentItem, "id">[] = [

  // ── Configuration and Setup (config-setup) ──────────────────────────────────

  {
    domain: "config-setup", domainLabel: "Configuration and Setup", domainWeight: "0.18",
    itemType: "mc",
    question: "An admin needs to change the fiscal year start month for their org. Where should they navigate to make this change?",
    options: [
      { id: "a", text: "Setup → Fiscal Year → Custom Fiscal Year" },
      { id: "b", text: "Setup → Company Information → Edit" },
      { id: "c", text: "Setup → Fiscal Year → Standard Fiscal Year" },
      { id: "d", text: "Setup → Time Zones → Fiscal Settings" },
    ],
    correctOption: "c",
    explanation: "Standard Fiscal Year settings are under Setup → Fiscal Year. Custom Fiscal Year is for non-standard 4-4-5 or similar calendars and cannot be reverted once enabled.",
  },
  {
    domain: "config-setup", domainLabel: "Configuration and Setup", domainWeight: "0.18",
    itemType: "mc",
    question: "Which of the following is NOT a valid Salesforce edition?",
    options: [
      { id: "a", text: "Essentials" },
      { id: "b", text: "Professional" },
      { id: "c", text: "Advanced" },
      { id: "d", text: "Enterprise" },
    ],
    correctOption: "c",
    explanation: "Salesforce editions are Essentials, Professional, Enterprise, Unlimited, and Developer. 'Advanced' is not a Salesforce edition.",
  },
  {
    domain: "config-setup", domainLabel: "Configuration and Setup", domainWeight: "0.18",
    itemType: "mc",
    question: "An admin wants to allow users to log in from any IP address but only during business hours. Which feature should they configure?",
    options: [
      { id: "a", text: "Trusted IP Ranges" },
      { id: "b", text: "Login Hours" },
      { id: "c", text: "Session Settings" },
      { id: "d", text: "Network Access" },
    ],
    correctOption: "b",
    explanation: "Login Hours restrict when users in a profile can access Salesforce. Trusted IP Ranges restrict which IP addresses can log in. Since the requirement is time-based (business hours) with no IP restriction, Login Hours is correct.",
  },
  {
    domain: "config-setup", domainLabel: "Configuration and Setup", domainWeight: "0.18",
    itemType: "mc",
    question: "Which setting controls how many records Salesforce displays per page in a list view?",
    options: [
      { id: "a", text: "List View Page Size in Session Settings" },
      { id: "b", text: "User Interface Settings → Records Per Page" },
      { id: "c", text: "Search Settings → Records Per Page" },
      { id: "d", text: "Personal Settings → Display → Records Per Page" },
    ],
    correctOption: "d",
    explanation: "Individual users can control records per page under their Personal Settings → Display & Layout. Admins cannot set this globally — it is a per-user preference.",
  },
  {
    domain: "config-setup", domainLabel: "Configuration and Setup", domainWeight: "0.18",
    itemType: "mc",
    question: "An org has reached its data storage limit. Which action will immediately free the most storage?",
    options: [
      { id: "a", text: "Delete unused user accounts" },
      { id: "b", text: "Permanently delete records from the Recycle Bin" },
      { id: "c", text: "Archive old reports" },
      { id: "d", text: "Remove custom fields from objects" },
    ],
    correctOption: "b",
    explanation: "Records in the Recycle Bin still count against data storage. Permanently deleting them (emptying the Recycle Bin) immediately reclaims storage. Deleting user accounts and archiving reports do not free data storage.",
  },
  {
    domain: "config-setup", domainLabel: "Configuration and Setup", domainWeight: "0.18",
    itemType: "mc",
    question: "What is the maximum number of custom profiles an org can create?",
    options: [
      { id: "a", text: "100" },
      { id: "b", text: "500" },
      { id: "c", text: "1,000" },
      { id: "d", text: "There is no hard limit" },
    ],
    correctOption: "d",
    explanation: "Salesforce does not impose a hard limit on the number of custom profiles. However, the total number of profiles (standard + custom) across all license types must be manageable within your edition constraints.",
  },

  // ── Object Manager and Lightning App Builder ────────────────────────────────

  {
    domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: "0.18",
    itemType: "mc",
    question: "An admin creates a custom field on the Opportunity object with a data type of 'Formula'. Which statement about this field is TRUE?",
    options: [
      { id: "a", text: "The field value is stored in the database and updated nightly" },
      { id: "b", text: "The field value is calculated in real time and not stored in the database" },
      { id: "c", text: "The field can be used as a source field in a roll-up summary" },
      { id: "d", text: "The field can be edited directly by end users" },
    ],
    correctOption: "b",
    explanation: "Formula fields are calculated dynamically at query time and not stored in the database. They are read-only to users and cannot serve as the source field of a roll-up summary (only the target object can have a roll-up summary using fields from child records).",
  },
  {
    domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: "0.18",
    itemType: "mc",
    question: "Which relationship type allows records on the child object to be linked to multiple parent records simultaneously?",
    options: [
      { id: "a", text: "Master-Detail" },
      { id: "b", text: "Lookup" },
      { id: "c", text: "Many-to-Many (Junction Object)" },
      { id: "d", text: "Hierarchical" },
    ],
    correctOption: "c",
    explanation: "A many-to-many relationship is implemented with a junction object that has two master-detail or lookup relationships. This lets a single child record relate to multiple records on two different parent objects simultaneously.",
  },
  {
    domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: "0.18",
    itemType: "mc",
    question: "A sales rep updates a Contact's phone number. The Account's 'Last Activity' date does not update. Which field type could an admin add to Account to automatically track the most recent Activity Date from related Contacts?",
    options: [
      { id: "a", text: "Cross-object formula field on Account" },
      { id: "b", text: "Roll-up summary field on Account using MAX" },
      { id: "c", text: "Lookup field on Contact pointing to Account" },
      { id: "d", text: "Formula field on Contact referencing Account" },
    ],
    correctOption: "b",
    explanation: "A roll-up summary field on Account (the master) can roll up a MAX of ActivityDate from related Activity child records. This keeps the Account automatically in sync without code.",
  },
  {
    domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: "0.18",
    itemType: "mc",
    question: "Which page layout component allows an admin to display a related list of child records directly inline on a record page in Lightning Experience?",
    options: [
      { id: "a", text: "Related List" },
      { id: "b", text: "Related List — Single" },
      { id: "c", text: "Highlights Panel" },
      { id: "d", text: "Tabs component" },
    ],
    correctOption: "b",
    explanation: "'Related List — Single' is a standard Lightning component that displays one related list inline on the record page. 'Related List' (plural) shows all related lists at the bottom of the page in a section.",
  },
  {
    domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: "0.18",
    itemType: "mc",
    question: "An admin deletes a custom object. What happens to the data in that object?",
    options: [
      { id: "a", text: "Data is archived for 30 days and then permanently deleted" },
      { id: "b", text: "Data is moved to the Recycle Bin along with the object" },
      { id: "c", text: "Data is permanently deleted immediately" },
      { id: "d", text: "Data is exported automatically to a CSV" },
    ],
    correctOption: "b",
    explanation: "When a custom object is deleted, its records and the object definition go to the Recycle Bin. You have 15 days to restore them. After that, they are permanently deleted.",
  },

  // ── Sales and Marketing Applications ────────────────────────────────────────

  {
    domain: "sales-marketing", domainLabel: "Sales and Marketing Applications", domainWeight: "0.12",
    itemType: "mc",
    question: "A sales manager wants to ensure reps can only see and edit opportunities they own. Which feature should the admin use?",
    options: [
      { id: "a", text: "Role hierarchy with private sharing model on Opportunity" },
      { id: "b", text: "Profile-level object permissions set to Read/Edit" },
      { id: "c", text: "Criteria-based sharing rules on Opportunity" },
      { id: "d", text: "Territory management" },
    ],
    correctOption: "a",
    explanation: "Setting the Opportunity OWD (Org-Wide Default) to Private means users can only see records they own, and the role hierarchy controls upward visibility to managers. Profiles alone cannot restrict record-level access — OWDs and sharing rules control that.",
  },
  {
    domain: "sales-marketing", domainLabel: "Sales and Marketing Applications", domainWeight: "0.12",
    itemType: "mc",
    question: "Which Campaign Member status is set automatically when a Contact or Lead is added to a Campaign via import?",
    options: [
      { id: "a", text: "Sent" },
      { id: "b", text: "Responded" },
      { id: "c", text: "Member" },
      { id: "d", text: "The default status defined on the Campaign" },
    ],
    correctOption: "d",
    explanation: "When importing Campaign Members, Salesforce assigns the default Campaign Member Status defined on the Campaign object. Admins can configure this default on the Campaign.",
  },
  {
    domain: "sales-marketing", domainLabel: "Sales and Marketing Applications", domainWeight: "0.12",
    itemType: "mc",
    question: "What does the 'Probability' field on an Opportunity represent?",
    options: [
      { id: "a", text: "A manually entered percentage set by the sales rep" },
      { id: "b", text: "An AI-generated win likelihood from Einstein" },
      { id: "c", text: "A default percentage associated with the Opportunity Stage" },
      { id: "d", text: "The ratio of closed-won deals to total pipeline" },
    ],
    correctOption: "c",
    explanation: "Probability is a default percentage tied to each Stage picklist value. When a rep changes the Stage, Probability auto-updates to the default for that stage. Reps can override it manually.",
  },
  {
    domain: "sales-marketing", domainLabel: "Sales and Marketing Applications", domainWeight: "0.12",
    itemType: "mc",
    question: "An admin needs to allow sales reps to create a Quote from an Opportunity and send it to a Contact. Which standard Salesforce feature supports this?",
    options: [
      { id: "a", text: "Price Books and Products" },
      { id: "b", text: "CPQ (Salesforce Configure, Price, Quote)" },
      { id: "c", text: "Quotes (standard object)" },
      { id: "d", text: "Orders object" },
    ],
    correctOption: "c",
    explanation: "Salesforce has a standard Quotes object that lets reps generate a PDF quote from an Opportunity and email it to a Contact. CPQ is a separate managed package for more complex quoting needs.",
  },
  {
    domain: "sales-marketing", domainLabel: "Sales and Marketing Applications", domainWeight: "0.12",
    itemType: "mc",
    question: "Which standard report type should an admin use to report on Leads that have NOT been converted?",
    options: [
      { id: "a", text: "Leads with Converted Lead Information" },
      { id: "b", text: "Leads" },
      { id: "c", text: "Lead History" },
      { id: "d", text: "Leads and Contacts" },
    ],
    correctOption: "b",
    explanation: "The 'Leads' report type shows all Lead records including unconverted ones. You can add a filter for IsConverted = False to show only unconverted leads. 'Leads with Converted Lead Information' would include conversion data.",
  },

  // ── Service and Support Applications ────────────────────────────────────────

  {
    domain: "service-support", domainLabel: "Service and Support Applications", domainWeight: "0.11",
    itemType: "mc",
    question: "A support manager wants cases to automatically escalate to a supervisor if not resolved within 4 hours. Which feature should the admin configure?",
    options: [
      { id: "a", text: "Assignment Rules" },
      { id: "b", text: "Escalation Rules" },
      { id: "c", text: "Auto-Response Rules" },
      { id: "d", text: "Workflow Rules with Time-Based Actions" },
    ],
    correctOption: "b",
    explanation: "Escalation Rules are specifically designed to escalate cases based on time thresholds. They can change the Case Owner, send notifications, or set priority when a case ages past a defined point.",
  },
  {
    domain: "service-support", domainLabel: "Service and Support Applications", domainWeight: "0.11",
    itemType: "mc",
    question: "Which Service Cloud feature lets customers submit cases through a company's website without logging into Salesforce?",
    options: [
      { id: "a", text: "Web-to-Case" },
      { id: "b", text: "Email-to-Case" },
      { id: "c", text: "Live Agent" },
      { id: "d", text: "Self-Service Portal" },
    ],
    correctOption: "a",
    explanation: "Web-to-Case generates an HTML form that companies embed on their website. Submitted forms create Case records in Salesforce without requiring the customer to log in.",
  },
  {
    domain: "service-support", domainLabel: "Service and Support Applications", domainWeight: "0.11",
    itemType: "mc",
    question: "A customer replies to a case email and the reply should automatically update the Case in Salesforce. Which feature enables this?",
    options: [
      { id: "a", text: "Web-to-Case" },
      { id: "b", text: "Email-to-Case" },
      { id: "c", text: "Case Assignment Rules" },
      { id: "d", text: "Case Auto-Response Rules" },
    ],
    correctOption: "b",
    explanation: "Email-to-Case routes incoming emails to Cases. When a customer replies to a case notification, the reply is threaded back to the originating Case as a Case Comment or Email Message.",
  },
  {
    domain: "service-support", domainLabel: "Service and Support Applications", domainWeight: "0.11",
    itemType: "mc",
    question: "What is the purpose of a Case Team in Salesforce?",
    options: [
      { id: "a", text: "To assign cases to a queue for round-robin distribution" },
      { id: "b", text: "To allow multiple users to collaborate on a single case with defined roles and access levels" },
      { id: "c", text: "To automatically escalate cases to the next tier of support" },
      { id: "d", text: "To define SLA milestones for a group of cases" },
    ],
    correctOption: "b",
    explanation: "Case Teams allow multiple users to work together on a single Case, each with a defined team role (e.g. Case Manager, Customer Contact) and a specific access level (Read or Read/Write).",
  },
  {
    domain: "service-support", domainLabel: "Service and Support Applications", domainWeight: "0.11",
    itemType: "mc",
    question: "Which Salesforce feature allows agents to see a step-by-step guide for handling a specific type of case?",
    options: [
      { id: "a", text: "Path" },
      { id: "b", text: "Milestones" },
      { id: "c", text: "Quick Text" },
      { id: "d", text: "Macros" },
    ],
    correctOption: "a",
    explanation: "Path (Lightning Path) guides users through key stages of a record's lifecycle and can display coaching tips and key fields at each stage — ideal for case-handling procedures.",
  },

  // ── Productivity and Collaboration ───────────────────────────────────────────

  {
    domain: "productivity", domainLabel: "Productivity and Collaboration", domainWeight: "0.07",
    itemType: "mc",
    question: "A sales rep wants to log a call on a Contact without leaving the record page. Which Salesforce feature allows this?",
    options: [
      { id: "a", text: "Activity Timeline" },
      { id: "b", text: "Log a Call from the Chatter feed" },
      { id: "c", text: "Log a Call action (quick action)" },
      { id: "d", text: "Task list view" },
    ],
    correctOption: "c",
    explanation: "'Log a Call' is a standard quick action available on Activity-enabled objects (Contact, Lead, Account, Opportunity). It creates a completed Task and appears inline on the record page.",
  },
  {
    domain: "productivity", domainLabel: "Productivity and Collaboration", domainWeight: "0.07",
    itemType: "mc",
    question: "An admin wants all reps to receive an in-app notification whenever a high-priority Case is assigned to them. Which tool should the admin use?",
    options: [
      { id: "a", text: "Email Alerts in Workflow Rules" },
      { id: "b", text: "Custom Notification in Flow Builder" },
      { id: "c", text: "Apex trigger with Messaging.SingleEmailMessage" },
      { id: "d", text: "Process Builder email notification" },
    ],
    correctOption: "b",
    explanation: "Flow Builder's 'Send Custom Notification' action delivers Bell (in-app) and/or Push notifications without code. It is the recommended declarative approach for in-app notifications in Lightning.",
  },
  {
    domain: "productivity", domainLabel: "Productivity and Collaboration", domainWeight: "0.07",
    itemType: "mc",
    question: "Which Salesforce Inbox feature helps reps track whether a prospect opened their email?",
    options: [
      { id: "a", text: "Email Tracking" },
      { id: "b", text: "Activity Capture" },
      { id: "c", text: "Einstein Email Insights" },
      { id: "d", text: "Send Later" },
    ],
    correctOption: "a",
    explanation: "Email Tracking (part of Salesforce Inbox) inserts a 1×1 tracking pixel that fires when the recipient opens the email, recording an Open event on the related Salesforce Activity.",
  },
  {
    domain: "productivity", domainLabel: "Productivity and Collaboration", domainWeight: "0.07",
    itemType: "mc",
    question: "What does the Salesforce Mobile App's 'Today' page show by default?",
    options: [
      { id: "a", text: "A filtered list view of the user's records" },
      { id: "b", text: "A summary of the user's tasks, events, and news from the day" },
      { id: "c", text: "Chatter notifications from the last 24 hours" },
      { id: "d", text: "A real-time dashboard updated every 15 minutes" },
    ],
    correctOption: "b",
    explanation: "The Today page in the Salesforce Mobile App aggregates the user's upcoming events, overdue tasks, and Einstein-powered news about their accounts and contacts for the day.",
  },
  {
    domain: "productivity", domainLabel: "Productivity and Collaboration", domainWeight: "0.07",
    itemType: "mc",
    question: "An admin needs to allow users to send templated emails to multiple contacts in one click from a list view. Which feature supports this?",
    options: [
      { id: "a", text: "Mass Email" },
      { id: "b", text: "Send List Email (List Email)" },
      { id: "c", text: "Email-to-Case" },
      { id: "d", text: "Macros" },
    ],
    correctOption: "b",
    explanation: "Send List Email (List Email) allows users to send an individualized email using an HTML template to multiple contacts or leads selected from a list view — each recipient gets their own copy with merge fields resolved.",
  },

  // ── Data and Analytics Management ───────────────────────────────────────────

  {
    domain: "data-analytics", domainLabel: "Data and Analytics Management", domainWeight: "0.13",
    itemType: "mc",
    question: "An admin runs a Data Export and notices the export ZIP does not contain records deleted in the last 30 days. How should they export deleted records?",
    options: [
      { id: "a", text: "Enable 'Include Deleted Records' in the Data Export settings" },
      { id: "b", text: "Use Data Loader with the 'Export All (includeDeleted)' operation" },
      { id: "c", text: "Query the Recycle Bin report in Reports & Dashboards" },
      { id: "d", text: "Use the Salesforce Inspector browser extension" },
    ],
    correctOption: "b",
    explanation: "Data Loader's 'Export All' operation includes soft-deleted records (IsDeleted = true) that are still in the Recycle Bin. The standard Data Export in Setup does not include deleted records.",
  },
  {
    domain: "data-analytics", domainLabel: "Data and Analytics Management", domainWeight: "0.13",
    itemType: "mc",
    question: "Which report format allows an admin to display sub-totals grouped by a single field?",
    options: [
      { id: "a", text: "Tabular" },
      { id: "b", text: "Summary" },
      { id: "c", text: "Matrix" },
      { id: "d", text: "Joined" },
    ],
    correctOption: "b",
    explanation: "Summary reports group rows by a field and display sub-totals and totals for each group. Matrix reports support two grouping dimensions. Tabular reports have no groupings. Joined reports combine multiple report blocks.",
  },
  {
    domain: "data-analytics", domainLabel: "Data and Analytics Management", domainWeight: "0.13",
    itemType: "mc",
    question: "An admin wants a dashboard chart that automatically shows 'green' when a KPI is above target and 'red' when below. Which dashboard feature should they use?",
    options: [
      { id: "a", text: "Conditional highlighting on a report" },
      { id: "b", text: "Gauge chart with conditional segment colors" },
      { id: "c", text: "Report chart color coding" },
      { id: "d", text: "Dynamic dashboard filters" },
    ],
    correctOption: "b",
    explanation: "A Gauge dashboard component lets you define segments with colors (green/yellow/red) and threshold values. It's designed specifically for showing a single metric against a target range.",
  },
  {
    domain: "data-analytics", domainLabel: "Data and Analytics Management", domainWeight: "0.13",
    itemType: "mc",
    question: "What is the maximum number of records that a standard SOQL query returns without a LIMIT clause in Apex?",
    options: [
      { id: "a", text: "1,000" },
      { id: "b", text: "2,000" },
      { id: "c", text: "50,000" },
      { id: "d", text: "Unlimited — all matching records" },
    ],
    correctOption: "c",
    explanation: "A SOQL query executed in Apex can return a maximum of 50,000 records. Without a LIMIT clause, it returns all records up to this governor limit. Exceeding this throws a QueryException.",
  },
  {
    domain: "data-analytics", domainLabel: "Data and Analytics Management", domainWeight: "0.13",
    itemType: "mc",
    question: "An admin needs to upsert 500,000 Contact records and match on an external ID field. Which tool is BEST suited for this?",
    options: [
      { id: "a", text: "Import Wizard" },
      { id: "b", text: "Data Loader" },
      { id: "c", text: "Reports and Dashboards" },
      { id: "d", text: "Mass Update in list views" },
    ],
    correctOption: "b",
    explanation: "Data Loader handles up to 5 million records and supports the 'Upsert' operation against an external ID field. Import Wizard maxes out at 50,000 records and does not support upsert on external IDs.",
  },

  // ── Workflow and Process Automation ─────────────────────────────────────────

  {
    domain: "workflow-automation", domainLabel: "Workflow and Process Automation", domainWeight: "0.15",
    itemType: "mc",
    question: "An admin needs to create a new record in a child object whenever a parent record meets a specific condition. Which automation tool should they use?",
    options: [
      { id: "a", text: "Workflow Rule with a Field Update action" },
      { id: "b", text: "Approval Process" },
      { id: "c", text: "Flow Builder (Record-Triggered Flow)" },
      { id: "d", text: "Assignment Rule" },
    ],
    correctOption: "c",
    explanation: "Flow Builder's Record-Triggered Flow can create records on related or unrelated objects. Workflow Rules can only update fields on the same record or related record via field update — they cannot create new records.",
  },
  {
    domain: "workflow-automation", domainLabel: "Workflow and Process Automation", domainWeight: "0.15",
    itemType: "mc",
    question: "Which flow trigger fires when a user submits a screen and moves to the next screen, but before the record is saved?",
    options: [
      { id: "a", text: "Record-Triggered Flow — Before Save" },
      { id: "b", text: "Screen Flow — there is no concept of 'before save' in screen flows" },
      { id: "c", text: "Schedule-Triggered Flow" },
      { id: "d", text: "Autolaunched Flow" },
    ],
    correctOption: "b",
    explanation: "Screen Flows run on-demand and involve user interaction. They commit data when the flow reaches a DML element (Create/Update Record). There is no before-save trigger in screen flows — that concept belongs to record-triggered flows.",
  },
  {
    domain: "workflow-automation", domainLabel: "Workflow and Process Automation", domainWeight: "0.15",
    itemType: "mc",
    question: "An admin builds an approval process for discounts above 20%. The approval must go to the submitter's manager, then to VP Sales. Which approval assignment method should they configure for step 1?",
    options: [
      { id: "a", text: "Queue" },
      { id: "b", text: "Related User (Manager field on User object)" },
      { id: "c", text: "Specific User" },
      { id: "d", text: "Role" },
    ],
    correctOption: "b",
    explanation: "Selecting 'Related User' with the Manager field dynamically routes to the submitter's manager stored on their User record — no hardcoding required. This is the standard pattern for manager-approval steps.",
  },
  {
    domain: "workflow-automation", domainLabel: "Workflow and Process Automation", domainWeight: "0.15",
    itemType: "mc",
    question: "What is the primary difference between a Before-Save and After-Save record-triggered flow?",
    options: [
      { id: "a", text: "Before-Save flows can send emails; After-Save flows cannot" },
      { id: "b", text: "Before-Save flows can update the triggering record without a DML statement, consuming no DML governor limit; After-Save flows require an explicit Update Records element" },
      { id: "c", text: "After-Save flows run synchronously; Before-Save flows run asynchronously" },
      { id: "d", text: "Before-Save flows can create related records; After-Save flows cannot" },
    ],
    correctOption: "b",
    explanation: "Before-Save flows run before the record is written to the database and can modify the triggering record's fields for free (no DML consumed). After-Save flows run after the commit and need an explicit DML element to update the triggering record, consuming governor limits.",
  },
  {
    domain: "workflow-automation", domainLabel: "Workflow and Process Automation", domainWeight: "0.15",
    itemType: "mc",
    question: "A scheduled flow is set to run every day at midnight. The flow has an error on Day 3. What happens on Day 4?",
    options: [
      { id: "a", text: "The flow is paused and does not run until the admin resolves the error" },
      { id: "b", text: "The flow retries Day 3's batch automatically and then runs Day 4's batch" },
      { id: "c", text: "The flow deactivates itself and sends an error email to the admin" },
      { id: "d", text: "The flow runs Day 4's batch and skips the failed Day 3 records" },
    ],
    correctOption: "c",
    explanation: "When a scheduled flow encounters an unhandled fault, it automatically deactivates itself and sends an email to the admin. The admin must fix the error and reactivate the flow.",
  },

  // ── Security and Access Management ──────────────────────────────────────────

  {
    domain: "security-access", domainLabel: "Security and Access Management", domainWeight: "0.06",
    itemType: "mc",
    question: "A user has Read access to Accounts through their profile and a sharing rule grants them Read/Write access to the same records. What is their effective access level?",
    options: [
      { id: "a", text: "Read — the more restrictive setting always wins" },
      { id: "b", text: "Read/Write — sharing rules can only open access, never restrict it" },
      { id: "c", text: "Read/Write — but only if approved by an admin" },
      { id: "d", text: "No access — conflicting rules default to no access" },
    ],
    correctOption: "b",
    explanation: "The Salesforce sharing model is additive. Sharing rules can only grant additional access beyond the OWD — they never restrict what the profile or OWD already allows. The most permissive rule wins.",
  },
  {
    domain: "security-access", domainLabel: "Security and Access Management", domainWeight: "0.06",
    itemType: "mc",
    question: "Which object-level security control determines whether a user can see a tab for an object in the app navigation?",
    options: [
      { id: "a", text: "Field-Level Security" },
      { id: "b", text: "Tab Setting in the user's profile or permission set" },
      { id: "c", text: "Org-Wide Default for the object" },
      { id: "d", text: "The object's visibility setting in App Manager" },
    ],
    correctOption: "b",
    explanation: "Tab visibility is controlled at the Profile (or Permission Set) level — Default On, Default Off, or Tab Hidden. 'Tab Hidden' removes the tab from navigation but does not prevent record access via other means.",
  },
  {
    domain: "security-access", domainLabel: "Security and Access Management", domainWeight: "0.06",
    itemType: "mc",
    question: "An admin wants to grant a single user temporary access to a specific record they do not own and cannot see through normal sharing rules. What is the SIMPLEST way to do this?",
    options: [
      { id: "a", text: "Create a sharing rule for that specific record" },
      { id: "b", text: "Manually share the record using the Sharing button on the record" },
      { id: "c", text: "Add the user to the same role as the record owner" },
      { id: "d", text: "Change the OWD to Public Read/Write temporarily" },
    ],
    correctOption: "b",
    explanation: "Manual sharing (the 'Sharing' button on a record) lets the record owner or admin grant access to a specific user or group for a single record. Sharing rules apply to groups of records — not individual ones. Changing OWDs affects all records in the org.",
  },
  {
    domain: "security-access", domainLabel: "Security and Access Management", domainWeight: "0.06",
    itemType: "mc",
    question: "What is the purpose of a Permission Set Group?",
    options: [
      { id: "a", text: "To assign multiple permission sets to multiple users in a single step" },
      { id: "b", text: "To bundle multiple permission sets together so they can be assigned to a user as a single unit" },
      { id: "c", text: "To restrict the combined permissions of multiple permission sets" },
      { id: "d", text: "To replace profiles in the admin console" },
    ],
    correctOption: "b",
    explanation: "A Permission Set Group bundles multiple Permission Sets into a single, assignable unit. Assigning the group to a user grants all permissions from every member Permission Set. It simplifies administration when a user needs a defined combination of permissions.",
  },
  {
    domain: "security-access", domainLabel: "Security and Access Management", domainWeight: "0.06",
    itemType: "mc",
    question: "Which Salesforce Health Check score component relates to how long users can be inactive before their session automatically expires?",
    options: [
      { id: "a", text: "Session Timeout" },
      { id: "b", text: "Login Hours" },
      { id: "c", text: "Trusted IP Range" },
      { id: "d", text: "Password Complexity" },
    ],
    correctOption: "a",
    explanation: "Session Timeout (under Session Settings) defines the inactivity period before a user is automatically logged out. Salesforce Health Check flags orgs with very long or unlimited timeout settings as security risks.",
  },
  // ── Scenario items (one per domain — Penny scores free-text responses) ────────

  // Each rubric has exactly three criteria shown to the learner before they write.
  // Penny scores each criterion pass/fail + rationale in the background.

  {
    domain: "config-setup", domainLabel: "Configuration and Setup", domainWeight: "0.18",
    itemType: "scenario",
    question: "A new Salesforce org needs to be configured for a company with three departments that should not see each other's records. Describe how you would set up the sharing model and security layers to enforce this isolation.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Correctly identifies org-wide defaults, role hierarchy, or sharing rules as the relevant mechanisms." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains why each configuration choice achieves the intended isolation." },
        { id: "completeness", label: "Completeness",        description: "Covers at least two of the three tiers: OWD, role hierarchy, and manual sharing or sharing rules." },
      ],
    },
    explanation: "Set org-wide defaults to Private for the relevant objects, design a role hierarchy that keeps departments separate, and use sharing rules or manual sharing only where cross-department access is intentional.",
  },
  {
    domain: "object-manager-builder", domainLabel: "Object Manager and Lightning App Builder", domainWeight: "0.18",
    itemType: "scenario",
    question: "A sales team needs to track 'Partner Deals' differently from standard Opportunities — with different fields, stages, and page layouts. Describe how you would configure Salesforce to support this without creating a separate object.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Identifies Record Types as the correct mechanism for differentiating process within the same object." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains how record types connect to page layouts, picklist values, and business processes." },
        { id: "completeness", label: "Completeness",        description: "Mentions both the record type configuration AND the assignment to relevant profiles or permission sets." },
      ],
    },
    explanation: "Create a 'Partner Deal' Record Type on the Opportunity object, assign a dedicated sales process and page layout to it, and assign the record type to the relevant user profiles.",
  },
  {
    domain: "sales-marketing", domainLabel: "Sales and Marketing Applications", domainWeight: "0.12",
    itemType: "scenario",
    question: "A marketing manager wants to automatically assign new Leads from a specific country to a regional team and send them a welcome email. Describe the Salesforce features you would use to automate this.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Correctly names Lead Assignment Rules and an email automation tool (workflow rule, flow, or marketing tool)." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains the trigger condition (country field) and how assignment + email are connected." },
        { id: "completeness", label: "Completeness",        description: "Addresses both the assignment logic and the email notification as separate, configured steps." },
      ],
    },
    explanation: "Use Lead Assignment Rules to route leads by Country to the regional queue, then use a Flow (or workflow rule) with an email alert action to send the welcome message when the assignment fires.",
  },
  {
    domain: "service-support", domainLabel: "Service and Support Applications", domainWeight: "0.11",
    itemType: "scenario",
    question: "A support team wants cases escalated to a manager when they remain open for more than 8 business hours. Describe how you would implement this in Salesforce Service Cloud.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Correctly identifies Escalation Rules (within Entitlements or standalone) as the primary feature." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains how the time-based trigger and action (reassign or notify) are configured." },
        { id: "completeness", label: "Completeness",        description: "Mentions that business hours must be defined and associated with the escalation rule for time to be business-hours-aware." },
      ],
    },
    explanation: "Define your business hours in Setup, create a Case Escalation Rule entry that triggers after 8 business hours, and configure the escalation action to reassign the case or send a notification to the manager.",
  },
  {
    domain: "productivity", domainLabel: "Productivity and Collaboration", domainWeight: "0.07",
    itemType: "scenario",
    question: "A team of 20 sales reps needs a shared calendar view of all customer meetings, plus the ability to log call notes directly from the Salesforce mobile app. Describe how you would configure this.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Identifies Shared Activities, Salesforce Calendar, or List View calendars as the relevant feature." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains how reps would access the shared view and log calls on mobile." },
        { id: "completeness", label: "Completeness",        description: "Addresses both the shared calendar requirement and the mobile call logging requirement as distinct steps." },
      ],
    },
    explanation: "Enable Shared Activities so reps can relate multiple contacts to one activity, configure a List View Calendar on Events filtered by owner, and confirm the Salesforce Mobile App is set up with the Log a Call quick action on the relevant layouts.",
  },
  {
    domain: "data-analytics", domainLabel: "Data and Analytics Management", domainWeight: "0.13",
    itemType: "scenario",
    question: "A sales director wants a dashboard that shows current quarter pipeline by stage, updated in real time, visible only to managers. Describe how you would build and secure this in Salesforce.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Correctly describes building an Opportunity report filtered by current quarter, grouped by stage, then adding it to a dashboard." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains how dashboard folder sharing restricts visibility to managers only." },
        { id: "completeness", label: "Completeness",        description: "Mentions both the underlying report configuration AND the folder-level sharing setting." },
      ],
    },
    explanation: "Create a summary Opportunity report grouped by Stage, filtered to Current FQ. Add it as a component on a new dashboard. Store the dashboard in a folder shared only with the Manager role (or a permission-based group).",
  },
  {
    domain: "workflow-automation", domainLabel: "Workflow and Process Automation", domainWeight: "0.15",
    itemType: "scenario",
    question: "When an Opportunity is marked Closed Won, the sales rep's manager should receive a Chatter notification and a related Task should be created for the rep to schedule an onboarding call within 5 days. Describe how you would automate this.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Correctly identifies a Flow (or Process Builder + Workflow) as the automation tool and names the correct actions (Post to Chatter, Create Task)." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains the trigger (Stage = Closed Won) and how the manager is identified as the Chatter target." },
        { id: "completeness", label: "Completeness",        description: "Covers both actions (Chatter post AND Task creation) and specifies the 5-day due date on the Task." },
      ],
    },
    explanation: "Build a Record-Triggered Flow on Opportunity that fires when Stage changes to Closed Won. Add a Post to Chatter action targeting the rep's manager and a Create Records action for a Task due 5 days from today assigned to the rep.",
  },
  {
    domain: "security-access", domainLabel: "Security and Access Management", domainWeight: "0.06",
    itemType: "scenario",
    question: "A contractor needs temporary access to a specific set of Salesforce records for 30 days but must not see any other data or configuration. Describe how you would grant and then revoke this access safely.",
    rubric: {
      criteria: [
        { id: "accuracy",     label: "Technical Accuracy",  description: "Identifies a restrictive Profile or Permission Set combined with sharing rules or manual sharing to grant scoped access." },
        { id: "reasoning",    label: "Clear Reasoning",     description: "Explains why a narrowly scoped permission set is preferable to a broad profile for temporary, limited access." },
        { id: "completeness", label: "Completeness",        description: "Describes both the grant step (profile/PS + sharing) AND the revocation step (deactivate user or remove permission set after 30 days)." },
      ],
    },
    explanation: "Create a minimal Permission Set that grants only the object and field access needed. Assign it to the contractor's user. Use manual sharing or sharing rules to expose the specific records. After 30 days, remove the permission set assignment and deactivate the user if access is no longer needed.",
  },
];

// ── Seeder function ────────────────────────────────────────────────────────────
//
// Idempotent per item-type: each type is seeded independently so that running
// the seeder against an existing MC-populated database still inserts scenario
// items added in later releases.  Safe to call on every server start.

const MC_ITEMS       = ITEMS.filter(i => !i.itemType || i.itemType === "mc");
const SCENARIO_ITEMS = ITEMS.filter(i => i.itemType === "scenario");

export async function seedAssessmentItems(): Promise<void> {
  // ── MC items ────────────────────────────────────────────────────────────────
  const [{ mcCount }] = await db
    .select({ mcCount: count() })
    .from(assessmentItemsTable)
    .where(eq(assessmentItemsTable.itemType, "mc"));

  if (Number(mcCount) === 0) {
    await db.insert(assessmentItemsTable).values(MC_ITEMS);
    console.log(`[seed] Inserted ${MC_ITEMS.length} MC assessment items`);
  } else {
    console.log(`[seed] MC items already present (${mcCount} rows) — skipping`);
  }

  // ── Scenario items ──────────────────────────────────────────────────────────
  const [{ scenarioCount }] = await db
    .select({ scenarioCount: count() })
    .from(assessmentItemsTable)
    .where(eq(assessmentItemsTable.itemType, "scenario"));

  if (Number(scenarioCount) === 0) {
    await db.insert(assessmentItemsTable).values(SCENARIO_ITEMS);
    console.log(`[seed] Inserted ${SCENARIO_ITEMS.length} scenario assessment items`);
  } else {
    console.log(`[seed] Scenario items already present (${scenarioCount} rows) — skipping`);
  }
}

