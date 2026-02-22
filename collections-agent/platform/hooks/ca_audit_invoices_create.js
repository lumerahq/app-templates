export const config = {
  collection: 'ca_invoices',
  trigger: 'after_create',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      const curr = ctx.record;
      const label = curr.invoice_number
        ? `Invoice created: ${curr.invoice_number} for ${curr.customer_name || 'Unknown'}`
        : `Invoice created for ${curr.customer_name || 'Unknown'}`;

      await ctx.dao.create('ca_audit_log', {
        action: 'create',
        action_category: 'invoice',
        action_label: label,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ca_invoices',
        target_record_id: curr.id,
        before_state: null,
        after_state: {
          invoice_number: curr.invoice_number,
          customer_name: curr.customer_name,
          amount: curr.amount,
          due_date: curr.due_date,
          status: curr.status,
        },
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
