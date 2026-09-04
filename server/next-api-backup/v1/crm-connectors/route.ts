import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query, run } from '@/lib/db/db';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';
import { syncExternalCrmConnector } from '@/lib/crm/connectors';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connectors = await query<any>(
    'SELECT id, organization_id, provider, name, sync_frequency_hours, status, last_synced_at, created_at FROM external_crm_connectors WHERE organization_id = ? ORDER BY created_at DESC',
    [session.organization_id]
  );

  return NextResponse.json({ connectors });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider, name, api_key_or_token, api_endpoint, sync_frequency_hours } = await req.json();

  if (!provider || !name || !api_key_or_token) {
    return NextResponse.json({ error: 'provider, name, and api_key_or_token are required.' }, { status: 400 });
  }

  const connectorId = cryptoNativeOrRandomUUID();

  await run(
    `INSERT INTO external_crm_connectors (id, organization_id, provider, name, api_key_or_token, api_endpoint, sync_frequency_hours, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))`,
    [
      connectorId,
      session.organization_id,
      provider,
      name,
      api_key_or_token,
      api_endpoint || null,
      sync_frequency_hours || 24
    ]
  );

  // Trigger initial automated extraction sync
  const syncResult = await syncExternalCrmConnector(connectorId).catch(err => {
    console.error('[CRM Connector Initial Sync Error]:', err);
    return { extractedCount: 0, newLeadsCount: 0 };
  });

  return NextResponse.json({
    message: `External CRM Connector (${provider}) established successfully. Extracted ${syncResult.newLeadsCount} new leads.`,
    connector_id: connectorId,
    sync_summary: syncResult
  }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required to trigger sync.' }, { status: 400 });

  const syncResult = await syncExternalCrmConnector(id);

  return NextResponse.json({
    message: `External CRM data extraction completed. Extracted ${syncResult.extractedCount} items, added ${syncResult.newLeadsCount} new leads.`,
    sync_summary: syncResult
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  await run('DELETE FROM external_crm_connectors WHERE id = ? AND organization_id = ?', [id, session.organization_id]);

  return NextResponse.json({ message: 'CRM Connector removed successfully.' });
}
