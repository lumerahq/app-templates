export const config = {
  external_id: 'invoice-processing:ip_create_status_comment',
  collection: 'ip_invoices',
  trigger: 'after_update',
  enabled: true,
};

export default async function handler(ctx) {
  async function main(ctx) {
    try {
      const prev = ctx.original || {};
      const curr = ctx.record;

      // Only create a comment when status actually changed
      if (prev.status === curr.status) return;

      const statusLabels = {
        draft: 'Draft',
        processing: 'Processing',
        review: 'Review',
        approved: 'Approved',
        rejected: 'Rejected',
      };

      const fromLabel = statusLabels[prev.status] || prev.status;
      const toLabel = statusLabels[curr.status] || curr.status;

      await ctx.dao.create('ip_comments', {
        invoice_id: curr.id,
        content: `Status changed from ${fromLabel} to ${toLabel}`,
        comment_type: 'system',
        author_name: ctx.user?.name || 'System',
        author_email: ctx.user?.email || null,
      });
    } catch (err) {
      ctx.log('Error creating status comment:', err.message);
    }
  }
  return main(ctx);
}
