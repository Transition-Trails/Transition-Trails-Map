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

    // ── Learner surface ───────────────────────────────────────────────────
    learnerAuthenticated?: boolean;
    learnerContactId?:     string;
    learnerEmail?:         string;
    learnerName?:          string;
    learnerTrail?:         string | null;
    dailyQuest?:           Record<string, unknown>;
    dailyQuestDate?:       string;
  }
}
