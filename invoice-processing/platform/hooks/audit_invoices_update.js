export const config = {
  external_id: 'my-lumera-app:audit_invoices_update',
  collection: 'invoices',
  trigger: 'after_update',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      const prev = ctx.original || {};
      const curr = ctx.record;
      const statusChanged = prev.status !== curr.status;
      const name = curr.vendor_name || curr.invoice_number || 'Unknown';

      // Build a descriptive label based on what changed
      let actionLabel;
      if (statusChanged) {
        switch (curr.status) {
          case 'processing':
            actionLabel = `AI extraction started for: ${name}`;
            break;
          case 'review':
            actionLabel = `AI extraction completed for: ${name}`;
            break;
          case 'approved':
            actionLabel = `Invoice approved: ${name}`;
            break;
          case 'rejected':
            actionLabel = `Invoice rejected: ${name}`;
            break;
          default:
            actionLabel = `Invoice status changed to ${curr.status}: ${name}`;
        }
      } else {
        actionLabel = `Updated invoice: ${name}`;
      }

      // Capture fields that changed
      const trackedFields = [
        'vendor_name', 'invoice_number', 'invoice_date', 'due_date',
        'total_amount', 'currency', 'description', 'status', 'notes',
      ];

      const beforeState = {};
      const afterState = {};
      let hasChanges = false;

      for (const field of trackedFields) {
        if (JSON.stringify(prev[field]) !== JSON.stringify(curr[field])) {
          beforeState[field] = prev[field];
          afterState[field] = curr[field];
          hasChanges = true;
        }
      }

      if (!hasChanges) return;

      await ctx.dao.create('audit_log', {
        action: 'update',
        action_category: 'invoice',
        action_label: actionLabel,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'invoices',
        target_record_id: curr.id,
        before_state: beforeState,
        after_state: afterState,
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
