export const config = {
  collection: 'vendors',
  trigger: 'after_update',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      const prev = ctx.original || {};
      const curr = ctx.record;

      const beforeState = {};
      const afterState = {};
      let hasChanges = false;

      for (const field of ['name', 'default_gl_code']) {
        if (prev[field] !== curr[field]) {
          beforeState[field] = prev[field];
          afterState[field] = curr[field];
          hasChanges = true;
        }
      }

      if (!hasChanges) return;

      await ctx.dao.create('inv_audit_log', {
        action: 'update',
        action_category: 'vendor',
        action_label: `Updated vendor: ${curr.name}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'vendors',
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
