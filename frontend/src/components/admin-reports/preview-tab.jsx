/**
 * Institutional Reports · Tab 3: Report Preview.
 * Professional institutional document with export actions (clearly
 * simulated) and save-to-library.
 */

import { FileBarChart } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { PreviewDoc, PreviewActions } from './shared'

function ReportPreviewTab({ doc, onExport, onPrint, onSave }) {
  if (!doc) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="No report generated yet"
        description="Pick a report type, set filters and hit Generate — the document preview will appear here."
      />
    )
  }
  return (
    <div className="space-y-5">
      <PreviewActions onExport={onExport} onPrint={onPrint} onSave={onSave} />
      <PreviewDoc doc={doc} footerNote="Confidential — for institutional management use. All metrics derived from the intelligence foundation." />
    </div>
  )
}

export { ReportPreviewTab }
export default ReportPreviewTab
