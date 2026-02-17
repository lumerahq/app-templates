export const config = {
  collection: 'vendors',
  trigger: 'after_delete',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('inv_audit_log', {
        action: 'delete',
        action_category: 'vendor',
        action_label: `Deleted vendor: ${ctx.record.name}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'vendors',
        target_record_id: ctx.record.id,
        before_state: {
          name: ctx.record.name,
          default_gl_code: ctx.record.default_gl_code,
        },
        after_state: null,
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
