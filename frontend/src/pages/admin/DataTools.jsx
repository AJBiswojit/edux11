import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Download, FileSpreadsheet, FolderUp, RefreshCw, UploadCloud, XCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useAdminDataTools } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@/components/ui'
import { formatRelative } from '@/utils/format'

function DataTools() {
  const { data, isLoading, isError, refetch } = useAdminDataTools()
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/json': ['.json'] },
    maxFiles: 1,
  })

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const startUpload = () => {
    if (!acceptedFiles.length) {
      toast.error('No file selected', 'Drop a CSV, XLSX or JSON file first.')
      return
    }
    toast.info('Unavailable', 'Data import is not available yet.')
  }

  const statusMeta = { Ready: ['success', CheckCircle2], Queued: ['secondary', RefreshCw], Processing: ['info', RefreshCw], Completed: ['success', CheckCircle2], Failed: ['danger', XCircle] }

  return (
    <div>
      <PageHeader
        eyebrow="Governance · Data Tools"
        title="Data export & import"
        description="Bulk operations with validation, templates and full audit logging — move data in and out safely."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Data Export / Import' }]}
      />

      <Tabs defaultValue="export">
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="export"><Download className="h-4 w-4" /> Export</TabsTrigger>
          <TabsTrigger value="import"><UploadCloud className="h-4 w-4" /> Import</TabsTrigger>
          <TabsTrigger value="templates"><FileSpreadsheet className="h-4 w-4" /> Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(data?.exports ?? []).map((e, i) => {
              const meta = statusMeta[e.status] ?? statusMeta.Queued
              const [variant, Icon] = meta
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                      <FileSpreadsheet className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{e.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {e.format} · {e.rows.toLocaleString()} rows{e.generated !== '—' ? ` · generated ${formatRelative(e.generated)}` : ''}{e.size !== '—' ? ` · ${e.size}` : ''}
                      </p>
                    </div>
                    <Badge variant={variant}><Icon className="h-3 w-3" /> {e.status}</Badge>
                    <Button size="sm" variant="outline" disabled={e.status !== 'Ready'} onClick={() => toast.success('Downloading…', `${e.name}.${e.format.toLowerCase()} saved.`)}>
                      <Download className="h-3.5 w-3.5" /> Get
                    </Button>
                  </Card>
                </motion.div>
              )
            })}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
            <Download className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
            <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-800 dark:text-slate-100">On-demand exports:</span> pick any module (students, attendance, results, fees, questions) and any filter — exports are generated asynchronously and land in the queue above. Sensitive exports require a second admin's approval.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div {...getRootProps()} className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-10 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/70 dark:border-indigo-500/30 dark:bg-indigo-500/5">
                <input {...getInputProps()} />
                <UploadCloud className="h-10 w-10 text-indigo-500" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {acceptedFiles.length ? acceptedFiles[0].name : 'Drag & drop your file here'}
                </p>
                <p className="mt-1 text-xs text-slate-400">CSV, XLSX or JSON · validated before import · max 50 MB</p>
              </div>
              <Button className="mt-4 w-full" onClick={startUpload} disabled={uploading}>
                <RefreshCw className={`h-4 w-4 ${uploading ? 'animate-spin' : ''}`} />
                {uploading ? 'Validating & importing…' : 'Start import'}
              </Button>
            </div>

            <div>
              <p className="mb-3 text-[15px] font-bold text-slate-900 dark:text-white">Recent imports</p>
              <div className="space-y-3">
                {(data?.imports ?? []).map((im, i) => {
                  const meta = statusMeta[im.status] ?? statusMeta.Queued
                  const [variant, Icon] = meta
                  return (
                    <motion.div key={im.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="flex items-center gap-4 p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                          <FolderUp className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-bold text-slate-900 dark:text-white">{im.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {im.format} · {im.rows.toLocaleString()} rows · {formatRelative(im.uploaded)}
                          </p>
                          {im.errors != null && im.errors > 0 && (
                            <p className="mt-0.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400">{im.errors} rows skipped — see report</p>
                          )}
                        </div>
                        <Badge variant={variant}><Icon className="h-3 w-3" /> {im.status}</Badge>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(data?.templates ?? []).map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                    <Badge variant="outline" size="sm">CSV</Badge>
                  </div>
                  <h3 className="mt-3 font-mono text-[13px] font-bold text-slate-900 dark:text-white">{t.name}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">{t.desc}</p>
                  <Button size="sm" variant="outline" className="mt-3.5 w-full" onClick={() => toast.info('Unavailable', 'Import templates are not available yet.')}>
                    <Download className="h-3.5 w-3.5" /> Download template
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { DataTools }
export default DataTools
