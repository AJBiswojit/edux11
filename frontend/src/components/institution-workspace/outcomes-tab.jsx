/**
 * Institution Intelligence Workspace · Tab 9: Institutional Outcomes.
 * Placement, salary, research and scholarship outcomes — from the existing
 * admin datasets (no new datasets).
 */

import { Award, Briefcase, IndianRupee } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, LineTrend } from '@/components/charts'
import { Badge, Card } from '@/components/ui'
import { KpiStrip, WorkspaceSection } from './shared'

function OutcomesTab({ data }) {
  const ds = data.datasets?.analytics ?? {}
  const placements = ds.adminPlacements ?? {}
  const research = ds.adminResearch ?? {}
  const scholarships = ds.adminScholarships ?? []

  const totalBudget = scholarships.reduce((a, s) => a + (s.budget ?? 0), 0)

  return (
    <div>
      <KpiStrip
        cols={4}
        items={[
          { label: 'Placement rate', value: placements.kpis?.[0]?.value ?? '—', sub: 'season 2026-27' },
          { label: 'Average CTC', value: placements.kpis?.[1]?.value ?? '—', sub: placements.kpis?.[1]?.delta ?? '' },
          { label: 'Offers made', value: String(placements.kpis?.[2]?.value ?? '—'), sub: `${placements.kpis?.[2]?.delta ?? ''} vs last season` },
          { label: 'Top recruiters', value: String(placements.kpis?.[3]?.value ?? '—'), sub: 'companies hiring' },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Placement rate by branch" className="min-w-0">
          <BarCompare
            data={(placements.branchWise ?? []).map((b) => ({ label: b.branch, placed: b.placed }))}
            xKey="label"
            height={220}
            series={[{ key: 'placed', name: 'Placed %', color: '#10b981' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Offers by company" className="min-w-0">
          <BarCompare
            data={(placements.companyWise ?? []).map((c) => ({ label: c.company.split(' ')[0], offers: c.offers }))}
            xKey="label"
            height={220}
            series={[{ key: 'offers', name: 'Offers', color: '#6366f1' }]}
            formatter={(v) => `${v}`}
          />
        </ChartCard>

        <ChartCard title="Average CTC trend" subtitle="By placement year" className="min-w-0">
          <LineTrend
            data={(placements.salaryTrend ?? []).map((s) => ({ label: s.year, value: parseFloat(s.avg) || 0 }))}
            xKey="label"
            height={220}
            series={[{ key: 'value', name: 'Avg CTC (LPA)', color: '#f59e0b' }]}
            formatter={(v) => `₹${v} LPA`}
          />
        </ChartCard>
      </div>

      <WorkspaceSection title="Upcoming placement drives" subtitle="Scheduled this season">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(placements.drives ?? []).map((dr) => (
            <Card key={dr.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{dr.company}</p>
                <Badge variant="success" size="sm">{dr.stage}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{dr.role} · {dr.date}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                <Briefcase className="h-3 w-3" /> {dr.positions} positions
              </p>
            </Card>
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Research & aid outcomes" subtitle="Grants, publications and scholarships">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Grant funding trend" subtitle="₹ crore per year" className="min-w-0">
            <AreaTrend
              data={(research.grantTrend ?? []).map((g) => ({ label: String(g.year), value: g.amount }))}
              xKey="label"
              height={200}
              series={[{ key: 'value', name: 'Grant ₹ Cr', color: '#8b5cf6' }]}
              formatter={(v) => `₹${v} Cr`}
            />
          </ChartCard>

          <ChartCard title="Scholarship schemes" subtitle={`₹${(totalBudget / 1e7).toFixed(1)} Cr total budget`}>
            <div className="space-y-3">
              {scholarships.slice(0, 5).map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-[11.5px] font-semibold">
                    <span className="truncate text-slate-600 dark:text-slate-300">{s.name}</span>
                    <span className="shrink-0 text-slate-400">{s.awarded} awarded · ₹{(s.amount ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400"
                      style={{ width: `${s.budget ? Math.min(100, ((s.awarded ?? 0) * (s.amount ?? 0) / s.budget) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <Badge variant="outline" size="sm">Disbursed ₹2.9 Cr · 1,240 students FY 26-27</Badge>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
          </ChartCard>
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { OutcomesTab }
export default OutcomesTab
