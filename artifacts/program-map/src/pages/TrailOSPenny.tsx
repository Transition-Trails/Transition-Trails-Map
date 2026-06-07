import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { trailOsCapabilities } from '@/data/trailOsCapabilities';
import { pennyCapabilities } from '@/data/pennyCapabilities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Layers, Sparkles, Activity, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function TrailOSPenny() {
  const [activeLayer, setActiveLayer] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<any>(null);
  const { setSelectedItem } = useAppContext();

  const layers = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'trailOs', label: 'Trail OS', icon: Database },
    { id: 'penny', label: 'Penny AI', icon: Sparkles },
    { id: 'delivery', label: 'Delivery Loop', icon: Workflow },
    { id: 'analytics', label: 'Analytics', icon: Activity },
  ];

  const handleCardClick = (type: 'trailOs' | 'penny', item: any) => {
    setSelectedItem({ type, id: item.id, data: item });
    setSelectedDrawerItem({ type, ...item });
    setDrawerOpen(true);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Toggle Bar */}
      <div className="flex-none p-4 border-b border-border bg-card/30 backdrop-blur">
        <div className="flex space-x-2">
          {layers.map(layer => (
            <Button
              key={layer.id}
              variant={activeLayer === layer.id ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setActiveLayer(layer.id)}
            >
              <layer.icon className="w-4 h-4" />
              {layer.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
        
        {activeLayer === 'overview' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-serif font-bold text-foreground">Technology Ecosystem</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-primary/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Trail OS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Trail OS is the operational technology foundation that coordinates intake, project delivery, documentation, learner-client matching, org readiness, coach visibility, and outcomes measurement across all programs.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-secondary/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    Penny AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Penny is the AI learning and guidance layer embedded across all Transition Trails programs, providing personalized coaching, skill translation, and learning intelligence at every stage of the learner journey.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-12 p-8 border rounded-xl bg-white/50 flex flex-col items-center justify-center space-y-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ecosystem Architecture</h3>
              <div className="flex items-center gap-4 text-center">
                <div className="p-4 bg-white border rounded-lg shadow-sm w-48">
                  <Database className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <span className="font-semibold">Trail OS</span>
                  <span className="block text-xs text-muted-foreground">Infrastructure Layer</span>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-border w-16 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">powers</div>
                </div>
                <div className="p-4 bg-white border rounded-lg shadow-sm w-48">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-secondary" />
                  <span className="font-semibold">Penny AI</span>
                  <span className="block text-xs text-muted-foreground">Intelligence Layer</span>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-border w-16 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">guides</div>
                </div>
                <div className="p-4 bg-white border rounded-lg shadow-sm w-48">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-foreground" />
                  <span className="font-semibold">Programs</span>
                  <span className="block text-xs text-muted-foreground">Experience Layer</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLayer === 'trailOs' && (
          <div className="max-w-6xl mx-auto animate-in fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-bold mb-2">Trail OS Capabilities</h2>
              <p className="text-muted-foreground">Core infrastructural features enabling program delivery.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trailOsCapabilities.map(cap => (
                <Card 
                  key={cap.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm hover:shadow-md h-full flex flex-col"
                  onClick={() => handleCardClick('trailOs', cap)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-start gap-2">
                      <Database className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="leading-tight">{cap.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{cap.description}</p>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {cap.programs.slice(0, 2).map(p => (
                        <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                      ))}
                      {cap.programs.length > 2 && <Badge variant="secondary" className="text-[10px]">+{cap.programs.length - 2}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeLayer === 'penny' && (
          <div className="max-w-6xl mx-auto animate-in fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-bold mb-2">Penny AI Features</h2>
              <p className="text-muted-foreground">Intelligent coaching and guidance embedded in the learning journey.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pennyCapabilities.map(cap => (
                <Card 
                  key={cap.id} 
                  className="cursor-pointer hover:border-secondary/50 transition-colors shadow-sm hover:shadow-md h-full flex flex-col"
                  onClick={() => handleCardClick('penny', cap)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                      <span className="leading-tight">{cap.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{cap.purpose}</p>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {cap.programs.slice(0, 2).map(p => (
                        <Badge key={p} variant="outline" className="text-[10px] bg-white">{p}</Badge>
                      ))}
                      {cap.programs.length > 2 && <Badge variant="outline" className="text-[10px] bg-white">+{cap.programs.length - 2}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeLayer === 'delivery' && (
          <div className="max-w-5xl mx-auto animate-in fade-in">
            <h2 className="text-2xl font-serif font-bold mb-6">Delivery Loop</h2>
            <div className="bg-white rounded-xl p-8 border shadow-sm flex items-center justify-between overflow-x-auto min-h-[300px]">
              {['Intake', 'Orientation', 'Learning Sprints', 'Project Work', 'Review & Assessment', 'Outcomes Capture', 'Alumni Engagement'].map((step, i, arr) => (
                <div key={step} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center text-center w-28">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 text-lg font-bold text-muted-foreground border-2 border-transparent hover:border-primary cursor-pointer transition-colors hover:bg-primary/5 hover:text-primary">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium leading-tight">{step}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-12 h-px bg-border mx-2"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeLayer === 'analytics' && (
          <div className="max-w-5xl mx-auto animate-in fade-in">
            <h2 className="text-2xl font-serif font-bold mb-2">Platform Analytics</h2>
            <p className="text-sm text-muted-foreground mb-6">Illustrative — for planning purposes only.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Active Learners', value: '48', color: 'text-primary' },
                { label: 'Programs Running', value: '3', color: 'text-foreground' },
                { label: 'Placement Rate (90-day)', value: '67%', color: 'text-secondary' },
                { label: 'Average Cohort Completion', value: '82%', color: 'text-foreground' },
                { label: 'Coach-to-Learner Ratio', value: '1:8', color: 'text-muted-foreground' },
                { label: 'Source Documents Active', value: '14', color: 'text-foreground' },
              ].map(stat => (
                <Card key={stat.label} className="shadow-sm">
                  <CardContent className="p-6">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                    <div className={`text-4xl font-bold font-serif mt-2 ${stat.color}`}>{stat.value}</div>
                    <div className="h-2 w-full bg-muted/50 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-border w-2/3 rounded-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
          {selectedDrawerItem && (
            <div className="space-y-6 mt-6">
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="uppercase tracking-wider text-[10px]">
                    {selectedDrawerItem.type === 'trailOs' ? 'Trail OS Capability' : 'Penny AI Feature'}
                  </Badge>
                </div>
                <SheetTitle className="text-2xl font-serif text-foreground flex items-center gap-2">
                  {selectedDrawerItem.type === 'trailOs' ? <Database className="w-5 h-5 text-primary" /> : <Sparkles className="w-5 h-5 text-secondary" />}
                  {selectedDrawerItem.name}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Purpose</span>
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedDrawerItem.description || selectedDrawerItem.purpose}
                </p>
              </div>

              {selectedDrawerItem.type === 'penny' && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">How it works</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Operates actively within the learner's context to provide real-time translation and guidance, bridging the gap between programmatic objectives and user comprehension.
                  </p>
                </div>
              )}

              {selectedDrawerItem.type === 'trailOs' && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner Role</span>
                  <span className="text-sm font-medium">Operations Lead</span>
                </div>
              )}

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Active in Programs</span>
                <div className="flex flex-wrap gap-1">
                  {selectedDrawerItem.programs?.map((p: string) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  {selectedDrawerItem.type === 'trailOs' ? 'Related Penny Integrations' : 'Related Trail OS Capabilities'}
                </span>
                <div className="flex flex-wrap gap-1">
                  {(selectedDrawerItem.type === 'trailOs' ? selectedDrawerItem.penny : selectedDrawerItem.trailOsCapabilities)?.map((p: string) => (
                    <Badge key={p} variant="outline" className="bg-white">{p}</Badge>
                  ))}
                </div>
              </div>

              {selectedDrawerItem.type === 'trailOs' && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Related RESOLVE Phases</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedDrawerItem.resolve?.map((r: string) => (
                      <Badge key={r} variant="outline" className="bg-white">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
