import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CalendarCheck2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { Field, Input, Textarea, useToast, Button } from '@/components/ui'
import { CONTACT_INFO } from '@/datasets/platform/content.js'
import { RULES } from '@/validators'
import { useContactForm } from '@/services/auth'
import { Reveal, GradientText } from '@/components/shared/section-heading'

const TOPICS = ['Schools (K-12)', 'College / University', 'IIT / NIT / Autonomous', 'EdTech Company', 'Enterprise Academy', 'Partnership / Other']

function Contact() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const { mutateAsync, isPending } = useContactForm()
  const toast = useToast()
  const [topic, setTopic] = useState(TOPICS[0])
  const [sent, setSent] = useState(false)

  const onSubmit = async (values) => {
    try {
      const res = await mutateAsync({ ...values, topic })
      toast.success('Message sent ✓', res.message)
      setSent(true)
    } catch {
      toast.error('Could not send', 'Please try again in a moment.')
    }
  }

  return (
    <div className="bg-white pb-24 pt-32 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
          {/* Left — info */}
          <div>
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Contact</p>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                Let’s design your <GradientText>MediXO EduX</GradientText>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500 dark:text-slate-400">
                Tell us about your institution and we’ll reply within one business day — usually with a live demo tailored to your programmes.
              </p>
            </Reveal>

            <div className="mt-10 space-y-4">
              {[
                { icon: Mail, label: 'Email us', value: CONTACT_INFO.email },
                { icon: Phone, label: 'Call us', value: CONTACT_INFO.phone },
                { icon: MapPin, label: 'Visit us', value: CONTACT_INFO.address },
                { icon: Clock, label: 'Support hours', value: CONTACT_INFO.hours },
                { icon: CalendarCheck2, label: 'Demo slots', value: 'Mon–Fri · 10 AM – 6 PM IST' },
              ].map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-4 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25">
                    <row.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{row.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{row.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <Reveal delay={0.1}>
            <div className="rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-lift sm:p-9 dark:border-slate-800 dark:bg-slate-900">
              {sent ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-emerald"
                  >
                    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12.5 9 17.5 20 6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </motion.div>
                  <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Message received!</h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    Our team is on it. Expect a reply within one business day — check your inbox (and spam, just in case).
                  </p>
                  <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>Send another message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Tell us about you</p>
                    <p className="text-xs text-slate-400">Fields marked * are required.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" required error={errors.name?.message}>
                      <Input placeholder="Dr. Anil Menon" {...register('name', RULES.name)} />
                    </Field>
                    <Field label="Work email" required error={errors.email?.message}>
                      <Input type="email" placeholder="you@institution.edu" {...register('email', RULES.email)} />
                    </Field>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Institution" error={errors.institution?.message}>
                      <Input placeholder="Quantum University" {...register('institution')} />
                    </Field>
                    <Field label="I am interested in" required error={errors.topic?.message}>
                      <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm transition-all hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
                      >
                        {TOPICS.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Message" required error={errors.message?.message}>
                    <Textarea
                      rows={5}
                      placeholder="How many students? Which programmes? What would you like MediXO EduX to solve first?"
                      {...register('message', RULES.message)}
                    />
                  </Field>

                  <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                    {isPending ? 'Sending…' : 'Send message'}
                    <Send className="h-4 w-4" />
                  </Button>
                  <p className="text-center text-[11px] text-slate-400">
                    By submitting you agree to our privacy policy. We never share your details.
                  </p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

export { Contact }
export default Contact
