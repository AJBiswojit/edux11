/**
 * Shared support-ticket list grid + entrance animation wrapper. The ticket
 * card markup differs between Student and Faculty, so the caller supplies a
 * `renderTicket(ticket, index)` function; `empty` is an optional node shown
 * when there are no tickets.
 */
import { motion } from 'framer-motion'

function TicketList({ tickets, renderTicket, empty = null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tickets.length === 0 && empty}
      {tickets.map((t, i) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          {renderTicket(t, i)}
        </motion.div>
      ))}
    </div>
  )
}

export { TicketList }
export default TicketList
