import "express-session";

declare module "express-session" {
  interface SessionData {
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
