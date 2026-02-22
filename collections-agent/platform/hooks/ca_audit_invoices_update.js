export const config = {
  collection: 'ca_invoices',
  trigger: 'after_update',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      const prev = ctx.original || {};
      const curr = ctx.record;
      const name = curr.invoice_number || 'Unknown';

      const trackedFields = [
        'status', 'paid_amount', 'balance_remaining',
        'reminder_count', 'amount', 'due_date', 'days_overdue',
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

      let actionLabel;
      if (prev.status !== curr.status) {
        actionLabel = `Invoice ${curr.status}: ${name}`;
      } else if (prev.paid_amount !== curr.paid_amount) {
        actionLabel = `Payment applied to: ${name}`;
      } else {
        actionLabel = `Updated invoice: ${name}`;
      }

      await ctx.dao.create('ca_audit_log', {
        action: 'update',
        action_category: 'invoice',
        action_label: actionLabel,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ca_invoices',
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
