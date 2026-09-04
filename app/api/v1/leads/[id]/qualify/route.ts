import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get } from '@/lib/db/db';
import { qualifyLead } from '@/lib/ai/qualification';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lead = await get<any>(
    `SELECT l.*, s.name as source_name 
     FROM leads l 
     LEFT JOIN lead_sources s ON l.source_id = s.id 
     WHERE l.id = ? AND l.organization_id = ?`,
    [params.id, session.organization_id]
  );

  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  try {
    const result = await qualifyLead({
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      product_interest: lead.product_interest,
      source_name: lead.source_name
    });

    return NextResponse.json({
      message: 'Lead re-qualified successfully.',
      result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error qualifying lead' }, { status: 500 });
  }
}
