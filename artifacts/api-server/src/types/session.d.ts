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
    codeVerifier?:   string;
    state?:          string;
  }
}
