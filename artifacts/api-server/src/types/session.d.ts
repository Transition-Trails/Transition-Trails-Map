import "express-session";

declare module "express-session" {
  interface SessionData {
    // ── Google per-user sign-in ───────────────────────────────────────────
    /** Authenticated user's email (lower-cased). Present iff signed in via Google SSO. */
    googleEmail?:         string;
    googleName?:          string;
    /** Google subject identifier — stable across sessions. */
    googleSub?:           string;
    /** Trail OS group emails this user belongs to. */
    googleGroups?:        string[];
    /** Unix timestamp (ms) after which googleGroups should be re-fetched. */
    googleGroupsExpiry?:  number;
    /** Derived display tier — highest of the user's group set. */
    googleTier?:          string;
    /** Transient CSRF token for the OAuth state parameter. */
    googleOAuthState?:    string;

    // ── Salesforce service session ────────────────────────────────────────
    sfAccessToken?:  string;
    sfRefreshToken?: string;
    sfInstanceUrl?:  string;
    sfUserId?:       string;
    sfUsername?:     string;
    sfEmail?:        string;
    sfOrgId?:        string;
    sfIssuedAt?:     string;
    sfContactId?:    string | null;
    codeVerifier?:   string;
    state?:          string;

    // ── Homebase audience ─────────────────────────────────────────────────
    /**
     * Set when a signed-in user belongs to a homebase group (learner/coach/volunteer).
     * Null / absent for staff-only users.
     */
    googleAudience?: 'learner' | 'coach' | 'volunteer' | null;
    /**
     * Sub-level for coaches.  Populated once SF coaching fields are provisioned
     * (task #254).  Falls back to 'associate' on the frontend when absent.
     */
    coachLevel?: 'assistant' | 'associate' | 'advanced' | null;

    // ── Learner surface ───────────────────────────────────────────────────
    learnerAuthenticated?: boolean;
    learnerContactId?:     string;
    learnerEmail?:         string;
    learnerName?:          string;
    learnerTrail?:         string | null;
    dailyQuest?:           Record<string, unknown>;
    dailyQuestDate?:       string;

    // ── Homebase quest (Google-auth learner surface) ─────────────────────────
    homebaseQuest?:        Record<string, unknown>;
    homebaseQuestDate?:    string;
    /** ISO date (YYYY-MM-DD) when learner last set today's stone. */
    homebaseStoneSet?:     string;
  }
}
