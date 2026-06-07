import { PageShell } from '@/components/platform/PageShell';

export default function ChangeRequest() {
  return (
    <PageShell
      section="Demand Management"
      title="Submit Change Request"
      badge="future-state"
      subtitle="A public-facing form for team members, clients, or external stakeholders who do not have Salesforce access to submit requests, issues, or ideas."
      integration="Typeform / Google Forms → Salesforce Case (via Zapier)"
    >
      <div className="max-w-lg space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Change Request Form</h2>
          <p className="text-xs text-muted-foreground">This form is not yet active. When connected, submissions will automatically create a Salesforce Case.</p>

          {[
            { label: 'Request Type',       hint: 'e.g. Bug, Feature Request, Content Update, Admin' },
            { label: 'Program or Area',    hint: 'e.g. Explorer\'s Trail, Penny, Trail OS' },
            { label: 'Your Name',          hint: 'Full name' },
            { label: 'Your Email',         hint: 'Work email' },
            { label: 'Subject',            hint: 'Brief title for this request' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-foreground mb-1">{f.label}</label>
              <div className="h-9 rounded-md border border-border bg-muted/40 px-3 flex items-center">
                <span className="text-xs text-muted-foreground/60">{f.hint}</span>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
            <div className="h-24 rounded-md border border-border bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground/60">Describe the request in detail...</span>
            </div>
          </div>

          <div className="h-9 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary/70">Submit Request — Not yet active</span>
          </div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold text-sky-800 mb-1">How this will work</p>
          <p className="text-xs text-sky-700 leading-relaxed">
            Once connected, form submissions will route through Zapier to create a Salesforce Case automatically.
            The submitter receives an email confirmation with a case number, and the team is notified in Slack.
            Progress can then be tracked in the Salesforce Cases view.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
