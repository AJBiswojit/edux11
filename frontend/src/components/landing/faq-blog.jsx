import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock, MessageCircle } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, Input, useToast } from '@/components/ui'
import { FAQS, BLOG_POSTS } from '@/datasets/platform/content.js'
import { SectionHeading, Reveal } from '@/components/shared/section-heading'
import { useNewsletter } from '@/services/auth'
import { formatDate } from '@/utils/format'

function FAQ() {
  return (
    <section className="relative bg-slate-50 py-24 dark:bg-slate-950" id="faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Questions?
              <br />
              <span className="text-gradient">Answered.</span>
            </>
          }
          description="Everything institutions ask us before switching. Still curious? Our team replies within one business day."
        />
        <Accordion type="single" defaultValue="q0">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger value={`q${i}`}>{f.q}</AccordionTrigger>
              <AccordionContent value={`q${i}`}>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Reveal className="mt-10">
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 sm:flex-row dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Have a specific question?</p>
                <p className="text-xs text-slate-400">Our team will reply within one business day.</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/contact">Ask us anything <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const COVERS = {
  indigo: 'from-indigo-500 to-blue-600',
  teal: 'from-teal-500 to-emerald-600',
  violet: 'from-violet-500 to-purple-600',
  rose: 'from-rose-500 to-pink-600',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-600',
}

function BlogPreview() {
  const posts = BLOG_POSTS.slice(0, 3)
  return (
    <section className="relative bg-white py-24 dark:bg-slate-950" id="blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            align="left"
            className="mb-0"
            eyebrow="The MediXO Journal"
            title={
              <>
                Ideas from the
                <br />
                <span className="text-gradient">front line of AI education</span>
              </>
            }
          />
          <Button asChild variant="outline">
            <Link to="/blog">
              View all articles <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post.id} delay={i * 0.07}>
              <Link
                to={`/blog/${post.id}`}
                className="group block h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${COVERS[post.cover] ?? COVERS.indigo}`}>
                  <div className="bg-dots absolute inset-0 opacity-25" />
                  <div className="bg-grid absolute inset-0 opacity-20" />
                  <span className="relative rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white ring-1 ring-white/30 backdrop-blur-sm">
                    {post.category}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(post.date)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime} min read</span>
                  </div>
                  <h3 className="mt-3 text-[17px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{post.excerpt}</p>
                  <p className="mt-4 text-xs font-semibold text-slate-400">By {post.author}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const { mutateAsync, isPending } = useNewsletter()
  const toast = useToast()

  const subscribe = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error('Invalid email', 'Please enter a valid email address.')
      return
    }
    try {
      const res = await mutateAsync({ email })
      toast.success('Subscribed 🎉', res.message)
      setEmail('')
    } catch {
      toast.error('Subscription failed', 'Please try again in a moment.')
    }
  }

  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 dark:bg-black">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/4 top-0 h-72 w-72 animate-blob rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 animate-blob rounded-full bg-teal-500/20 blur-3xl" style={{ animationDelay: '6s' }} />
        <div className="bg-grid absolute inset-0 opacity-20" />
      </div>
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-glow"
        >
          <Sparkles className="h-6 w-6" />
        </motion.p>
        <SectionHeading
          eyebrow="Stay ahead"
          title={<span className="text-white">The future of education, in your inbox</span>}
          description={
            <span className="text-slate-400">
              One thoughtful email a month — pedagogy research, product updates and stories from 850+ institutions. No spam, ever.
            </span>
          }
        />
        <Reveal>
          <form onSubmit={subscribe} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@institution.edu"
              className="h-12 flex-1 rounded-2xl border-white/15 bg-white/10 text-white placeholder:text-slate-500 backdrop-blur-xl focus-visible:border-indigo-400"
            />
            <Button type="submit" disabled={isPending} size="lg" className="h-12 shrink-0">
              {isPending ? 'Subscribing…' : 'Subscribe'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-3 text-[11px] text-slate-500">Join 24,000+ educators. Unsubscribe anytime.</p>
        </Reveal>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export { FAQ, BlogPreview, Newsletter }
export default FAQ
