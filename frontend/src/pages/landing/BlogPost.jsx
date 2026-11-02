import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Share2, Sparkles } from 'lucide-react'
import { useBlogPost } from '@/services/auth'
import { GradientText } from '@/components/shared/section-heading'
import { MarkdownContent } from '@/components/shared/chat-message'
import { Avatar } from '@/components/ui/avatar'
import { PageLoader, ErrorState } from '@/components/shared/loading'
import { formatDate } from '@/utils/format'
import { useBlogPosts } from '@/services/auth'
import { useToast } from '@/components/ui'

const COVERS = {
  indigo: 'from-indigo-500 to-blue-600',
  teal: 'from-teal-500 to-emerald-600',
  violet: 'from-violet-500 to-purple-600',
  rose: 'from-rose-500 to-pink-600',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-600',
}

function BlogPost() {
  const { id } = useParams()
  const { data, isLoading, isError, refetch } = useBlogPost(id)
  const { data: allData } = useBlogPosts()
  const toast = useToast()
  const post = data?.post
  const related = (allData?.posts ?? []).filter((p) => String(p.id) !== id).slice(0, 3)

  if (isError) return <div className="min-h-[60vh] pt-32"><ErrorState onRetry={() => refetch()} title="Article unavailable" message="This article could not be loaded right now." /></div>
  if (isLoading || !post) return <div className="min-h-[60vh] pt-32"><PageLoader label="Reading article…" /></div>

  return (
    <div className="bg-white pb-24 dark:bg-slate-950">
      {/* Cover */}
      <div className={`relative flex min-h-[380px] items-end overflow-hidden bg-gradient-to-br ${COVERS[post.cover] ?? COVERS.indigo} pb-14 pt-32`}>
        <div className="bg-dots absolute inset-0 opacity-20" />
        <div className="bg-grid absolute inset-0 opacity-15" />
        <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
          <p className="mt-5 inline-flex rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-white ring-1 ring-white/30 backdrop-blur-sm">
            {post.category}
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[42px]">
            {post.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-2"><Avatar name={post.author} size="sm" /> {post.author}</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {formatDate(post.date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {post.readTime} min read</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <article className="max-w-3xl">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-card sm:p-10 dark:border-slate-800 dark:bg-slate-900">
            <MarkdownContent content={post.content} />
          </div>

          {/* share */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {})
                toast.success('Link copied', 'Share it with your network.')
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <Share2 className="h-4 w-4" /> Share article
            </button>
            <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-500/20 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" /> Written by humans, fact-checked with AI
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">About the author</p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={post.author} size="lg" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{post.author}</p>
                <p className="text-xs text-slate-400">{post.authorRole}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Contributing from the MediXO EduX network of educators, researchers and product builders.
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-teal-500 p-6 text-white shadow-lift">
            <p className="text-sm font-bold">Try the platform behind this article</p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/85">
              See how adaptive paths, GraphRAG search and the analytics cloud work — live demo in 20 minutes.
            </p>
            <Link to="/contact" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold ring-1 ring-white/30 transition-all hover:bg-white/25">
              Book a demo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Related */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
          Keep reading <GradientText>→</GradientText>
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {related.map((p) => (
            <Link
              key={p.id}
              to={`/blog/${p.id}`}
              className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">{p.category}</p>
              <h3 className="mt-2 text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                {p.title}
              </h3>
              <p className="mt-2 text-xs text-slate-400">{p.readTime} min read</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export { BlogPost }
export default BlogPost
