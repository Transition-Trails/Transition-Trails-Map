import { Settings, FileText, CheckCircle, Share2, AlignLeft, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Admin() {
  return (
    <div className="h-full w-full flex flex-col p-6 overflow-y-auto items-center">
      <div className="max-w-[600px] w-full">
        <div className="mb-8 text-center">
          <div className="bg-amber-100 text-amber-800 text-sm p-3 rounded-md mb-6 border border-amber-200">
            Admin functionality is not yet active. This page is a planning reference for the future data-management capability.
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-4">Coming Soon — Internal Admin</h1>
          <p className="text-muted-foreground">
            This screen will allow designated admins to update program cards, document summaries, source-of-truth mappings, data confidence statuses, related concepts, and sidebar decision briefs without editing the application code. Changes made here will update the dashboard for all internal users immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminCard
            icon={Layers}
            title="Program Cards"
            description="Update audience, outcomes, strategic role, confidence status"
          />
          <AdminCard
            icon={FileText}
            title="Document Registry"
            description="Edit document summaries, key decisions, source-of-truth mappings"
          />
          <AdminCard
            icon={CheckCircle}
            title="Confidence Statuses"
            description="Mark data as Confirmed, Needs Review, Draft, or Deprecated"
          />
          <AdminCard
            icon={Share2}
            title="Related Concepts"
            description="Update relationship mappings between programs, capabilities, and phases"
          />
          <AdminCard
            icon={AlignLeft}
            title="Decision Briefs"
            description="Edit the executive summaries and 'Why It Matters' copy in the context panel"
          />
          <AdminCard
            icon={Settings}
            title="Framework Mapping"
            description="Map RESOLVE phases, demand stages, and Trail OS to source documents"
          />
        </div>
      </div>
    </div>
  );
}

function AdminCard({ icon: Icon, title, description }: any) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2">
        <Icon className="w-5 h-5 text-primary mb-2" />
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="secondary" className="w-full text-xs" disabled>
          Coming Soon
        </Button>
      </CardContent>
    </Card>
  );
}
