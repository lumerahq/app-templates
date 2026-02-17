export const config = {
  external_id: 'my-lumera-app:audit_gl_accounts_create',
  collection: 'gl_accounts',
  trigger: 'after_create',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('audit_log', {
        action: 'create',
        action_category: 'gl_account',
        action_label: `Added GL account: ${ctx.record.code} — ${ctx.record.name}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'gl_accounts',
        target_record_id: ctx.record.id,
        before_state: null,
        after_state: {
          code: ctx.record.code,
          name: ctx.record.name,
          account_type: ctx.record.account_type,
        },
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
