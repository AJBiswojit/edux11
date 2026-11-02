/**
 * Shared support-ticket creation dialog shell (Dialog + header + form + footer
 * container). Role-specific field sets (native select vs Select component,
 * category/priority options, copy) are passed in as `children`; the submit /
 * cancel controls are passed as `footer`. Both pages keep their exact visuals.
 */
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'

function CreateTicketDialog({ open, onOpenChange, description, onSubmit, children, footer }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a support ticket</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <DialogFooter>{footer}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateTicketDialog }
export default CreateTicketDialog
