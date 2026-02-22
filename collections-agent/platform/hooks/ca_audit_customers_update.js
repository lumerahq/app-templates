export const config = {
  collection: 'ca_customers',
  trigger: 'after_update',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      const prev = ctx.original || {};
      const curr = ctx.record;
      const name = curr.name || 'Unknown';

      const trackedFields = [
        'name', 'email', 'status', 'total_outstanding', 'total_paid',
        'risk_score', 'risk_level', 'next_action', 'next_follow_up',
        'last_contact_date', 'payment_terms',
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
        actionLabel = `Status changed to ${curr.status}: ${name}`;
      } else if (prev.risk_score !== curr.risk_score) {
        actionLabel = `Risk score updated to ${curr.risk_score}: ${name}`;
      } else {
        actionLabel = `Updated customer: ${name}`;
      }

      await ctx.dao.create('ca_audit_log', {
        action: 'update',
        action_category: 'customer',
        action_label: actionLabel,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ca_customers',
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
