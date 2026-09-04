import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db/db';
import { qualifyLead } from '@/lib/ai/qualification';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

// GET status & Meta challenge verification
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'lead_rescue_ai_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  const source = await get<any>('SELECT id, name, type, is_active FROM lead_sources WHERE id = ?', [params.id]);
  if (!source || !source.is_active) {
    return NextResponse.json({ status: 'inactive', error: 'WhatsApp lead source inactive or not found.' }, { status: 404 });
  }

  return NextResponse.json({
    status: 'active',
    source_name: source.name,
    webhook_type: 'WhatsApp'
  });
}

// POST endpoint for parametric WhatsApp lead capture
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await get<any>('SELECT * FROM lead_sources WHERE id = ? AND is_active = 1', [params.id]);
    if (!source) {
      return NextResponse.json({ error: 'Invalid or inactive WhatsApp lead source.' }, { status: 404 });
    }

    let name = 'WhatsApp Contact';
    let phone: string | undefined = undefined;
    let messageText = 'WhatsApp Message';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      name = formData.get('ProfileName')?.toString() || 'WhatsApp Contact';
      phone = (formData.get('From')?.toString() || '').replace('whatsapp:', '').trim() || undefined;
      messageText = formData.get('Body')?.toString() || 'Inbound WhatsApp Inquiry';
    } else {
      const body = await req.json().catch(() => ({}));
      name = body.name || body.profile_name || body.contacts?.[0]?.profile?.name || 'WhatsApp Contact';
      phone = body.phone || body.from || body.messages?.[0]?.from || undefined;
      messageText = body.message || body.body || body.messages?.[0]?.text?.body || 'Inbound Inquiry';
    }

    const orgId = source.organization_id;

    // Check organization lead limit
    const orgInfo = await get<any>(
      `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [orgId]
    );

    if (orgInfo && orgInfo.actual_leads >= orgInfo.lead_limit) {
      return NextResponse.json(
        { error: `Organization lead limit of ${orgInfo.lead_limit} reached. Webhook payload rejected.` },
        { status: 400 }
      );
    }

    const initialStage = await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [orgId])
      || await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [orgId]);

    const leadId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, created_at, updated_at)
       VALUES (?, ?, ?, null, ?, null, ?, ?, 0, 'Pending', ?, 5000, datetime('now'), datetime('now'))`,
      [leadId, orgId, name, phone || null, messageText, source.id, initialStage?.id || null]
    );

    await run("UPDATE organizations SET current_lead_count = current_lead_count + 1 WHERE id = ?", [orgId]);

    qualifyLead({
      leadId,
      name,
      phone,
      product_interest: messageText,
      source_name: source.name
    }).catch(err => console.error('[WhatsApp Parametric AI Qualification Error]:', err));

    return NextResponse.json({
      success: true,
      message: 'WhatsApp lead captured successfully.',
      lead_id: leadId
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error processing WhatsApp payload' }, { status: 500 });
  }
}
