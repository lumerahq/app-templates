export const config = {
  external_id: 'my-lumera-app:trigger_extract',
  collection: 'payroll_runs',
  trigger: 'after_create',
  enabled: true
};

export default async function handler(ctx) {
  async function main(ctx) {
    // Only process new payroll runs with documents in draft status
    if (!ctx.record.document || ctx.record.status !== 'draft') return;

    // Set status to processing
    await ctx.dao.update('payroll_runs', ctx.record.id, { status: 'processing' });

    // Find the extract_payroll automation
    const [automation] = await ctx.dao.find('lm_automations', {
      filter: { external_id: 'my-lumera-app:extract_payroll' },
      limit: 1
    });

    if (!automation) {
      ctx.error('extract_payroll automation not found');
      return;
    }

    // Queue an automation run
    await ctx.dao.create('lm_automation_runs', {
      automation_id: automation.id,
      company_id: ctx.record.company_id || ctx.company?.id,
      owner_id: ctx.user?.id || automation.owner_id,
      inputs: JSON.stringify({ payroll_run_id: ctx.record.id }),
      status: 'queued',
      trigger: 'hook'
    });
  }
  return main(ctx);
}
