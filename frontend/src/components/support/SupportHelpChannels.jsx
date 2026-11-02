/**
 * Shared Support help-channel cards (3-column grid). Role-specific copy is
 * passed in via the `channels` prop so Student and Faculty keep their own text.
 */
import { motion } from 'framer-motion'
import { Button, Card, useToast } from '@/components/ui'

function SupportHelpChannels({ channels }) {
  const toast = useToast()
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      {channels.map((c, i) => (
        <motion.div key={c.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
              <c.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-slate-900 dark:text-white">{c.title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{c.desc}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => toast.info(c.title, 'Opening the support channel…')}>{c.cta}</Button>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export { SupportHelpChannels }
export default SupportHelpChannels
