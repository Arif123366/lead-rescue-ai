import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { sendFollowUp } from '@/lib/ai/followup';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { lead_id, template_id, custom_message, channel } = await req.json();

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required.' }, { status: 400 });
    }

    const result = await sendFollowUp({
      leadId: lead_id,
      templateId: template_id,
      customMessage: custom_message,
      channel
    });

    return NextResponse.json({
      message: 'Follow-up message sent successfully.',
      result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error sending follow-up message' }, { status: 400 });
  }
}
