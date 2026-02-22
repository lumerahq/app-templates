export const config = {
  external_id: 'invoice-processing:ip_audit_gl_accounts_create',
  collection: 'ip_gl_accounts',
  trigger: 'after_create',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('ip_audit_log', {
        action: 'create',
        action_category: 'gl_account',
        action_label: `Added GL account: ${ctx.record.code} — ${ctx.record.name}`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ip_gl_accounts',
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
