export const config = {
  external_id: 'my-lumera-app:audit_gl_accounts_delete',
  collection: 'gl_accounts',
  trigger: 'after_delete',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('audit_log', {
        action: 'delete',
        action_category: 'gl_account',
        action_label: `Deleted GL account: ${ctx.record.code} — ${ctx.record.name}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'gl_accounts',
        target_record_id: ctx.record.id,
        before_state: {
          code: ctx.record.code,
          name: ctx.record.name,
          account_type: ctx.record.account_type,
        },
        after_state: null,
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
