import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, run } from '@/lib/db/db';
import { qualifyLead } from '@/lib/ai/qualification';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await req.json(); // Array of parsed CSV row objects

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No valid lead rows provided for import.' }, { status: 400 });
  }

  // Check lead limit
  const orgInfo = await get<any>(
    `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
     FROM organizations o
     JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
     WHERE o.id = ?`,
    [session.organization_id]
  );

  const availableSlots = orgInfo ? Math.max(0, orgInfo.lead_limit - orgInfo.actual_leads) : rows.length;

  if (availableSlots <= 0) {
    return NextResponse.json(
      { error: `Lead limit of ${orgInfo.lead_limit} reached. Cannot import more leads. Upgrade subscription plan.` },
      { status: 400 }
    );
  }

  const rowsToImport = rows.slice(0, availableSlots);

  let manualSource = await get<any>('SELECT id FROM lead_sources WHERE organization_id = ? AND type = \'Manual\' LIMIT 1', [session.organization_id]);
  if (!manualSource) {
    const sourceId = cryptoNativeOrRandomUUID();
    await run(
      `INSERT INTO lead_sources (id, organization_id, name, type, configuration) VALUES (?, ?, 'CSV Upload', 'Manual', '{}')`,
      [sourceId, session.organization_id]
    );
    manualSource = { id: sourceId };
  }

  const initialStage = await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [session.organization_id])
    || await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [session.organization_id]);

  let importedCount = 0;
  const leadIdsToQualify: { id: string; name: string; email: string; phone: string; company: string; product_interest: string }[] = [];

  for (const row of rowsToImport) {
    const leadId = cryptoNativeOrRandomUUID();
    const name = row.name || row.Name || row['Full Name'] || 'Imported Lead';
    const email = row.email || row.Email || null;
    const phone = row.phone || row.Phone || null;
    const company = row.company || row.Company || null;
    const product_interest = row.product_interest || row['Product Interest'] || row.Interest || null;
    const deal_value = parseFloat(row.deal_value || row['Deal Value'] || row.Value || '0') || null;

    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, datetime('now'), datetime('now'))`,
      [leadId, session.organization_id, name, email, phone, company, product_interest, manualSource.id, initialStage.id, deal_value]
    );

    importedCount++;
    leadIdsToQualify.push({ id: leadId, name, email, phone, company, product_interest });
  }

  await run('UPDATE organizations SET current_lead_count = current_lead_count + ? WHERE id = ?', [importedCount, session.organization_id]);

  // Trigger async background qualification for imported leads
  Promise.all(
    leadIdsToQualify.map(item =>
      qualifyLead({
        leadId: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        company: item.company,
        product_interest: item.product_interest,
        source_name: 'CSV Bulk Upload'
      }).catch(err => console.error('Bulk qualification error:', err))
    )
  ).catch(err => console.error('Bulk import qualification error:', err));

  return NextResponse.json({
    message: `Successfully imported ${importedCount} leads. AI qualification in progress.`,
    imported_count: importedCount,
    skipped_count: rows.length - importedCount
  });
}
