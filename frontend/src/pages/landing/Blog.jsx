import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, Clock } from 'lucide-react'
import { useBlogPosts } from '@/services/auth'
import { GradientText, Reveal } from '@/components/shared/section-heading'
import { formatDate } from '@/utils/format'
import { PageLoader, ErrorState } from '@/components/shared/loading'

const COVERS = {
  indigo: 'from-indigo-500 to-blue-600',
  teal: 'from-teal-500 to-emerald-600',
  violet: 'from-violet-500 to-purple-600',
  rose: 'from-rose-500 to-pink-600',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-600',
}

function Blog() {
  const { data, isLoading, isError, refetch } = useBlogPosts()
  const posts = data?.posts ?? []

  return (
    <div className="bg-white pb-24 pt-32 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">The MediXO Journal</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Ideas from the front line of <GradientText>AI education</GradientText>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
            Research, product thinking and honest lessons from 850+ institutions using MediXO EduX. New articles every week.
          </p>
        </Reveal>

        {isLoading ? (
          <div className="mt-12"><PageLoader label="Loading articles…" /></div>
        ) : isError ? (
          <div className="mt-12"><ErrorState onRetry={() => refetch()} title="Articles unavailable" message="We could not load the journal right now." /></div>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.6 }}
              >
                <Link
                  to={`/blog/${post.id}`}
                  className="group block h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className={`relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br ${COVERS[post.cover] ?? COVERS.indigo}`}>
                    <div className="bg-dots absolute inset-0 opacity-25" />
                    <div className="bg-grid absolute inset-0 opacity-20" />
                    <span className="relative rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white ring-1 ring-white/30 backdrop-blur-sm">
                      {post.category}
                    </span>
                  </div>
                  <div className="flex h-full flex-col p-6">
                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(post.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime} min</span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                      {post.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{post.excerpt}</p>
                    <p className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span>By {post.author}</span>
                      <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        Read <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </p>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { Blog }
export default Blog
