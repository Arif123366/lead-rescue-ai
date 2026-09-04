import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query, run } from '@/lib/db/db';
import { addRagKnowledgeDocument } from '@/lib/ai/rag';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await query<any>(
    'SELECT * FROM organization_rag_knowledge WHERE organization_id = ? ORDER BY created_at DESC',
    [session.organization_id]
  );

  return NextResponse.json({ knowledge_base: items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, category } = await req.json();

  if (!title || !content) {
    return NextResponse.json({ error: 'title and content are required.' }, { status: 400 });
  }

  const result = await addRagKnowledgeDocument({
    organizationId: session.organization_id,
    title,
    content,
    category
  });

  return NextResponse.json({
    message: `Knowledge document successfully processed into ${result.count} semantic RAG chunks.`,
    chunks_created: result.count,
    doc_ids: result.docIds
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  await run('DELETE FROM organization_rag_knowledge WHERE id = ? AND organization_id = ?', [id, session.organization_id]);

  return NextResponse.json({ message: 'Knowledge item deleted successfully.' });
}
