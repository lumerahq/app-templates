export const config = {
  external_id: 'invoice-processing:ip_audit_invoices_create',
  collection: 'ip_invoices',
  trigger: 'after_create',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('ip_audit_log', {
        action: 'create',
        action_category: 'invoice',
        action_label: `Uploaded new invoice${ctx.record.vendor_name ? `: ${ctx.record.vendor_name}` : ''}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ip_invoices',
        target_record_id: ctx.record.id,
        before_state: null,
        after_state: {
          vendor_name: ctx.record.vendor_name,
          status: ctx.record.status,
          currency: ctx.record.currency,
          document: ctx.record.document?.original_name || null,
        },
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
