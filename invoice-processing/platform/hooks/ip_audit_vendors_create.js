export const config = {
  external_id: 'invoice-processing:ip_audit_vendors_create',
  collection: 'ip_vendors',
  trigger: 'after_create',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('ip_audit_log', {
        action: 'create',
        action_category: 'vendor',
        action_label: `Added vendor: ${ctx.record.name}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ip_vendors',
        target_record_id: ctx.record.id,
        before_state: null,
        after_state: {
          name: ctx.record.name,
          default_gl_code: ctx.record.default_gl_code,
        },
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
