/**
 * server/routes/rag.js
 * Express router for /api/v1/rag
 */

const express = require('express');
const router = express.Router();

const { query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { addRagKnowledgeDocument } = require('../../lib/ai/rag');

// GET /api/v1/rag/knowledge
router.get('/knowledge', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const items = await query(
      'SELECT * FROM organization_rag_knowledge WHERE organization_id = ? ORDER BY created_at DESC',
      [session.organization_id]
    );

    return res.json({ knowledge_base: items });
  } catch (err) {
    console.error('[rag/knowledge GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/rag/knowledge
router.post('/knowledge', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required.' });
    }

    const result = await addRagKnowledgeDocument({
      organizationId: session.organization_id,
      title,
      content,
      category
    });

    return res.status(201).json({
      message: `Knowledge document successfully processed into ${result.count} semantic RAG chunks.`,
      chunks_created: result.count,
      doc_ids: result.docIds
    });
  } catch (err) {
    console.error('[rag/knowledge POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/rag/knowledge
router.delete('/knowledge', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id is required.' });

    await run('DELETE FROM organization_rag_knowledge WHERE id = ? AND organization_id = ?', [id, session.organization_id]);

    return res.json({ message: 'Knowledge item deleted successfully.' });
  } catch (err) {
    console.error('[rag/knowledge DELETE]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
