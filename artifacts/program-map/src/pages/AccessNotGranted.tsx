import { ShieldOff, Mail } from "lucide-react";

/**
 * AccessNotGranted
 *
 * Shown to users who have authenticated with a @transitiontrails.org Google
 * account but are not in any known Trail OS group (staff OR homebase).
 * Gives a clear, actionable message rather than a generic 401/403.
 */
export default function AccessNotGranted() {
  return (
    <div className="min-h-screen bg-[hsl(40_30%_94%)] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center shadow-sm">
        <ShieldOff className="w-7 h-7 text-muted-foreground" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-xl font-semibold text-foreground">Access not granted</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account is not yet set up for Trail OS. Ask your programme
          coordinator to add you to the right group in Google Workspace.
        </p>
      </div>

      <a
        href="mailto:hello@transitiontrails.org"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm text-foreground hover:bg-muted/30 transition-colors"
      >
        <Mail className="w-4 h-4" />
        Contact Transition Trails
      </a>

      <button
        onClick={() => { window.location.href = '/sign-in'; }}
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        Sign in with a different account
      </button>
    </div>
  );
}
