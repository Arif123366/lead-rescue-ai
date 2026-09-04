import { NextRequest, NextResponse } from 'next/server';
import { processInboundResponse } from '@/lib/ai/followup';

export async function POST(req: NextRequest) {
  try {
    const { lead_id, response_content } = await req.json();

    if (!lead_id || !response_content) {
      return NextResponse.json({ error: 'lead_id and response_content are required.' }, { status: 400 });
    }

    await processInboundResponse(lead_id, response_content);

    return NextResponse.json({ message: 'Inbound response processed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error processing response' }, { status: 500 });
  }
}
