// ─────────────────────────────────────────────────────────────────────────────
// ContentStudio — Page shell
// Route: /penny/content-studio
// Eyebrow: "Penny · Create"  Icon: PenTool  Title: "Content Studio"
// Tabs: Pipeline, Topic, Content item, Build With Me, Penny desk, Trail Crew, Catalog
// Tab guard: when userTier === 'everyday' (crew audience), only Trail Crew tab is shown.
// Note: replace with viewerRole === 'crew' when that field is added to AppContext.
// ─────────────────────────────────────────────────────────────────────────────

import { PenTool } from 'lucide-react';
import { useLocation } from 'wouter';
import { HubShell } from '@/components/layout/HubShell';
import { useAppContext } from '@/context/AppContext';
import type { ContentItem } from './types';

import { PipelineTab }     from './tabs/PipelineTab';
import { TopicTab }        from './tabs/TopicTab';
import { ContentItemTab }  from './tabs/ContentItemTab';
import { BuildWithMeTab }  from './tabs/BuildWithMeTab';
import { PennyDeskTab }    from './tabs/PennyDeskTab';
import { TrailCrewTab }    from './tabs/TrailCrewTab';
import { CatalogTab }      from './tabs/CatalogTab';

const BASE = '/penny/content-studio';

export default function ContentStudio() {
  const { userTier } = useAppContext();
  const [, setLocation] = useLocation();

  // 'everyday' maps to the crew audience role; show only Trail Crew tab for crew members.
  const isCrew = userTier === 'everyday';

  function handleSelectItem(_item: ContentItem) {
    setLocation(`${BASE}/content-item`);
  }

  const allTabs = [
    {
      id: 'pipeline',
      label: 'Pipeline',
      path: BASE,
      content: <PipelineTab />,
    },
    {
      id: 'topic',
      label: 'Topic',
      path: `${BASE}/topic`,
      content: <TopicTab onSelectItem={handleSelectItem} />,
    },
    {
      id: 'content-item',
      label: 'Content item',
      path: `${BASE}/content-item`,
      content: <ContentItemTab />,
    },
    {
      id: 'build-with-me',
      label: 'Build With Me',
      path: `${BASE}/build-with-me`,
      content: <BuildWithMeTab />,
    },
    {
      id: 'penny-desk',
      label: 'Penny desk',
      path: `${BASE}/penny-desk`,
      content: <PennyDeskTab />,
    },
    {
      id: 'trail-crew',
      label: 'Trail Crew',
      path: `${BASE}/trail-crew`,
      content: <TrailCrewTab />,
    },
    {
      id: 'catalog',
      label: 'Catalog',
      path: `${BASE}/catalog`,
      content: <CatalogTab />,
    },
  ];

  const tabs = isCrew
    ? allTabs.filter(t => t.id === 'trail-crew')
    : allTabs;

  return (
    <HubShell
      title="Content Studio"
      icon={PenTool}
      badge="Penny · Create"
      description="Topic to publication to product, on the objects already in the org."
      tabs={tabs}
    />
  );
}
