export const config = {
  external_id: 'invoice-processing:ip_trigger_extract',
  collection: 'ip_invoices',
  trigger: 'after_create',
  enabled: true
};

export default async function handler(ctx) {
  async function main(ctx) {
    // Only process new invoices with documents in draft status
    if (!ctx.record.document || ctx.record.status !== 'draft') return;

    // Set status to processing
    await ctx.dao.update('ip_invoices', ctx.record.id, { status: 'processing' });

    // Find the extract_invoice automation
    const [automation] = await ctx.dao.find('lm_automations', {
      filter: { external_id: 'invoice-processing:extract_invoice' },
      limit: 1
    });

    if (!automation) {
      ctx.error('extract_invoice automation not found');
      return;
    }

    // Queue an automation run
    await ctx.dao.create('lm_automation_runs', {
      automation_id: automation.id,
      company_id: ctx.record.company_id || ctx.company?.id,
      owner_id: ctx.user?.id || automation.owner_id,
      inputs: JSON.stringify({ invoice_id: ctx.record.id }),
      status: 'queued',
      trigger: 'hook'
    });
  }
  return main(ctx);
}
