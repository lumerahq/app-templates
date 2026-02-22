export const config = {
  external_id: 'invoice-processing:ip_audit_line_items_create',
  collection: 'ip_line_items',
  trigger: 'after_create',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('ip_audit_log', {
        action: 'create',
        action_category: 'line_item',
        action_label: `Added line item: ${ctx.record.description || 'Untitled'}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ip_line_items',
        target_record_id: ctx.record.id,
        before_state: null,
        after_state: {
          invoice_id: ctx.record.invoice_id,
          description: ctx.record.description,
          quantity: ctx.record.quantity,
          unit_price: ctx.record.unit_price,
          amount: ctx.record.amount,
          gl_code: ctx.record.gl_code,
        },
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
