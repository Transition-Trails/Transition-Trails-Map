---
name: KnowledgeArticleVersion field discovery
description: KAV optional fields vary by org; must describe before querying or risk INVALID_FIELD 400s
---

## Rule
Never hardcode optional KAV fields in a SELECT without checking the org's field set first.

**Confirmed absent in this org:** `ArticleType` (causes INVALID_FIELD 400 if included).

**Always-safe fields:** `Id`, `KnowledgeArticleId`, `Title`, `PublishStatus`, `CreatedDate`, `LastModifiedDate`

**Optional (must probe):** `Summary`, `ArticleType`, `VersionNumber`, `IsVisibleInApp`, `Language`, `UrlName`

**Why:** Salesforce Knowledge schema varies significantly between orgs. Fields that exist in standard docs may not exist in a given org's KAV object.

**How to apply:** Use the `getKavFieldSet()` helper in `knowledge.ts` — it describes KAV via `/sobjects/KnowledgeArticleVersion/describe` on first call, caches the result for the server lifetime, and returns a `{ selectList, has(field) }` object. Both the list endpoint and detail endpoint must use it. The `ArticleType`-based WHERE filter and the type dropdown are gated on `fields.has("ArticleType")`.
