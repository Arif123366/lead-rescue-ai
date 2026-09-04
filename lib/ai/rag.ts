import { get, query, run } from '@/lib/db/db';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

export interface KnowledgeItem {
  id: string;
  organization_id: string;
  title: string;
  content_chunk: string;
  category: string;
  keywords: string;
  created_at: string;
}

/**
 * Adds a document/FAQ to organization's RAG knowledge base.
 * Automatically splits large documents into semantic chunks.
 */
export async function addRagKnowledgeDocument(params: {
  organizationId: string;
  title: string;
  content: string;
  category?: string;
}): Promise<{ count: number; docIds: string[] }> {
  const category = params.category || 'General Product Knowledge';
  
  // Split long text into ~500 character semantic chunks
  const chunks = chunkText(params.content, 500);
  const docIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const id = cryptoNativeOrRandomUUID();
    const chunkTextContent = chunks[i];
    const chunkTitle = chunks.length > 1 ? `${params.title} (Part ${i + 1}/${chunks.length})` : params.title;
    const keywords = extractKeywords(chunkTextContent);

    await run(
      `INSERT INTO organization_rag_knowledge (id, organization_id, title, content_chunk, category, keywords, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, params.organizationId, chunkTitle, chunkTextContent, category, keywords]
    );

    docIds.push(id);
  }

  return { count: chunks.length, docIds };
}

/**
 * Searches the organization's RAG knowledge base for context matching a query or lead interest.
 */
export async function retrieveRagContext(organizationId: string, queryText: string, limit: number = 3): Promise<string> {
  const allItems = await query<KnowledgeItem>(
    `SELECT * FROM organization_rag_knowledge WHERE organization_id = ? ORDER BY created_at DESC`,
    [organizationId]
  );

  if (allItems.length === 0) return '';

  const keywords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Score items based on keyword matches
  const scored = allItems.map(item => {
    let score = 0;
    const fullText = `${item.title} ${item.content_chunk} ${item.keywords}`.toLowerCase();
    
    for (const kw of keywords) {
      if (fullText.includes(kw)) score += 2;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const topItems = scored.slice(0, limit).map(s => `[Knowledge: ${s.item.title}]\n${s.item.content_chunk}`);
  return topItems.join('\n\n');
}

/**
 * Chunk long text into paragraphs / chunks of target size.
 */
function chunkText(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length <= chunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = para;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Simple keyword extractor for search optimization.
 */
function extractKeywords(text: string): string {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const unique = Array.from(new Set(words.filter(w => w.length > 4)));
  return unique.slice(0, 10).join(', ');
}
