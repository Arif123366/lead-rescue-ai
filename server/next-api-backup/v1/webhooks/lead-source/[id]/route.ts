import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db/db';
import { qualifyLead } from '@/lib/ai/qualification';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

// GET verification endpoint for webhook setup & health checks
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await get<any>('SELECT id, name, type, is_active FROM lead_sources WHERE id = ?', [params.id]);
    if (!source || !source.is_active) {
      return NextResponse.json({ status: 'inactive', error: 'Lead source webhook is inactive or not found.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'active',
      message: 'Lead Rescue AI Webhook Endpoint Ready.',
      source_id: source.id,
      source_name: source.name,
      source_type: source.type
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook status check failed' }, { status: 500 });
  }
}

// POST endpoint for inbound lead capture (JSON, Form-Data, & URL-encoded)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await get<any>('SELECT * FROM lead_sources WHERE id = ? AND is_active = 1', [params.id]);
    if (!source) {
      return NextResponse.json({ error: 'Invalid or inactive lead source webhook endpoint.' }, { status: 404 });
    }

    let name = 'Inbound Lead';
    let email: string | undefined = undefined;
    let phone: string | undefined = undefined;
    let company: string | undefined = undefined;
    let productInterest = 'Inbound Inquiry';
    let dealValue: number | undefined = undefined;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const rawObj: Record<string, string> = {};
      formData.forEach((value, key) => {
        rawObj[key.toLowerCase()] = value.toString();
      });

      name = rawObj['name'] || rawObj['full_name'] || rawObj['first_name'] ? `${rawObj['first_name'] || ''} ${rawObj['last_name'] || ''}`.trim() : 'Inbound Webhook Lead';
      email = rawObj['email'] || rawObj['email_address'] || undefined;
      phone = rawObj['phone'] || rawObj['phone_number'] || rawObj['mobile'] || undefined;
      company = rawObj['company'] || rawObj['company_name'] || rawObj['organization'] || undefined;
      productInterest = rawObj['product_interest'] || rawObj['interest'] || rawObj['message'] || rawObj['notes'] || 'Inbound Form Submission';
      dealValue = parseFloat(rawObj['deal_value'] || rawObj['budget'] || '0') || undefined;
    } else {
      // JSON body (Zapier, Make, Typeform, Webhook Tester)
      const body = await req.json().catch(() => ({}));
      const payload = body.data || body.lead || body.fields || body;

      const firstName = payload.first_name || payload.firstname || '';
      const lastName = payload.last_name || payload.lastname || '';

      if (payload.name || payload.full_name || payload.contact_name) {
        name = payload.name || payload.full_name || payload.contact_name;
      } else if (firstName || lastName) {
        name = `${firstName} ${lastName}`.trim();
      }

      email = payload.email || payload.email_address || payload.contact_email || undefined;
      phone = payload.phone || payload.phone_number || payload.mobile || payload.contact_phone || undefined;
      company = payload.company || payload.company_name || payload.organization || undefined;
      productInterest = payload.product_interest || payload.interest || payload.message || payload.notes || payload.subject || 'Inbound Webhook Inquiry';
      dealValue = parseFloat(payload.deal_value || payload.estimated_budget || payload.budget || '0') || undefined;
    }

    // Check organization lead limit
    const orgInfo = await get<any>(
      `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [source.organization_id]
    );

    if (orgInfo && orgInfo.actual_leads >= orgInfo.lead_limit) {
      return NextResponse.json(
        { error: `Organization lead limit of ${orgInfo.lead_limit} reached. Webhook payload rejected.` },
        { status: 400 }
      );
    }

    const initialStage = await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [source.organization_id])
      || await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [source.organization_id]);

    const leadId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, datetime('now'), datetime('now'))`,
      [
        leadId,
        source.organization_id,
        name,
        email || null,
        phone || null,
        company || null,
        productInterest,
        source.id,
        initialStage?.id || null,
        dealValue || null
      ]
    );

    await run("UPDATE organizations SET current_lead_count = current_lead_count + 1 WHERE id = ?", [source.organization_id]);

    // Trigger OpenRouter AI lead qualification asynchronously
    qualifyLead({
      leadId,
      name,
      email,
      phone,
      company,
      product_interest: productInterest,
      source_name: source.name
    }).catch(err => console.error('[Webhook AI Qualification Error]:', err));

    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully via webhook.',
      lead_id: leadId
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Lead Source Webhook Exception]:', error);
    return NextResponse.json({ error: error.message || 'Error processing webhook payload' }, { status: 500 });
  }
}
