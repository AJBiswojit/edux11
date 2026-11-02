/**
 * Institutional Reports · Tab 1: Report Center.
 * Catalog of the eight report types + predefined templates.
 */

import { WorkspaceSection } from '@/components/institution-workspace/shared'
import { ReportCard, TemplateCard } from './shared'

const TEMPLATES = [
  { id: 'tpl1', name: 'Executive Institution Review', category: 'Executive', includes: ['Overall status', 'Positives', 'Attention', 'Risks', 'Recommendations'] },
  { id: 'tpl2', name: 'Monthly Academic Review', category: 'Academic', includes: ['Retention', 'CGPA', 'Pass rates', 'Subjects'] },
  { id: 'tpl3', name: 'Department Performance Review', category: 'Management', includes: ['Comparison table', 'Strengths', 'Weaknesses', 'Focus'] },
  { id: 'tpl4', name: 'Student Success Review', category: 'Academic', includes: ['Distribution', 'At-risk', 'Readiness'] },
  { id: 'tpl5', name: 'Faculty Performance Review', category: 'Academic', includes: ['Health', 'Effectiveness', 'Workload'] },
  { id: 'tpl6', name: 'Assessment Review', category: 'Academic', includes: ['Averages', 'Readiness', 'Bank coverage'] },
  { id: 'tpl7', name: 'Risk & Intervention Review', category: 'Management', includes: ['Register', 'Trend', 'Actions'] },
  { id: 'tpl8', name: 'Institutional Outcomes Review', category: 'Executive', includes: ['Placement', 'CTC', 'Drives', 'Grants'] },
]

function ReportCenterTab({ types, lastUpdated, onGenerate, onView, onUseTemplate }) {
  return (
    <div>
      <WorkspaceSection title="Executive report center" subtitle="Management-grade reports generated from the institution intelligence foundation">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {types.map((type) => (
            <ReportCard key={type.id} type={type} lastUpdated={lastUpdated} onGenerate={onGenerate} onView={onView} />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Report templates" subtitle="Predefined formats — use, customize and generate">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} onUse={onUseTemplate} />
          ))}
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { ReportCenterTab, TEMPLATES }
export default ReportCenterTab
