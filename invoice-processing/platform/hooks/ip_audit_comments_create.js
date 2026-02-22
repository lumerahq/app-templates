export const config = {
  external_id: 'invoice-processing:ip_audit_comments_create',
  collection: 'ip_comments',
  trigger: 'after_create',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      await ctx.dao.create('ip_audit_log', {
        action: 'create',
        action_category: 'comment',
        action_label: `${ctx.record.comment_type === 'system' ? 'System' : 'User'} comment on invoice`,
        actor_id: ctx.user?.id || null,
        actor_name: ctx.user?.name || null,
        actor_email: ctx.user?.email || null,
        target_collection: 'ip_comments',
        target_record_id: ctx.record.id,
        before_state: null,
        after_state: {
          invoice_id: ctx.record.invoice_id,
          comment_type: ctx.record.comment_type,
          content: ctx.record.content,
        },
      });
    } catch (err) {
      ctx.log('Error creating audit log:', err.message);
    }
  }
  return main(ctx);
}
