import { get, run } from '../db/db';

export interface LeadQualificationInput {
  leadId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  product_interest?: string;
  source_name?: string;
}

export interface QualificationResult {
  score: number;
  status: 'Hot' | 'Warm' | 'Cold' | 'Insufficient Data';
  analysis_data: {
    customer_needs: string;
    budget: string;
    buying_intent: string;
    urgency: string;
    location: string;
    product_interest: string;
    summary: string;
  };
  ai_model_used: string;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = `You are Lead Rescue AI, an expert sales qualification engine used by B2B and B2C sales teams. 
Analyze the provided lead data and output ONLY valid JSON matching this exact structure:
{
  "score": <integer 0-100>,
  "status": "Hot" | "Warm" | "Cold",
  "analysis_data": {
    "customer_needs": "<concise description of customer needs>",
    "budget": "<budget estimate or indicator>",
    "buying_intent": "<buying intent level and signals>",
    "urgency": "High" | "Moderate" | "Low",
    "location": "<location if identifiable, else 'Unknown'>",
    "product_interest": "<specific product/service interest>",
    "summary": "<2-3 sentence executive summary for sales rep>"
  }
}

Scoring guide:
- Hot (75-100): Clear buying intent, budget signals, decision maker, urgent timeline
- Warm (45-74): Some interest, exploring options, moderate engagement
- Cold (0-44): Vague interest, no budget signals, early stage research

Output ONLY the JSON object. No markdown, no explanations.`;

export async function qualifyLead(input: LeadQualificationInput): Promise<QualificationResult> {
  let result: QualificationResult;

  // Retrieve lead's organization ID for RAG grounding
  const leadOrg = await get<{ organization_id: string }>('SELECT organization_id FROM leads WHERE id = ?', [input.leadId]);
  const organizationId = leadOrg?.organization_id;

  let ragContext = '';
  if (organizationId) {
    try {
      const { retrieveRagContext } = await import('./rag');
      ragContext = await retrieveRagContext(organizationId, `${input.product_interest || ''} ${input.company || ''}`);
    } catch (err) {
      console.warn('[qualification] RAG context fetch error:', err);
    }
  }

  if (OPENROUTER_API_KEY) {
    try {
      const userMessage = [
        `Lead Name: ${input.name || 'N/A'}`,
        `Company: ${input.company || 'N/A'}`,
        `Email: ${input.email || 'N/A'}`,
        `Phone: ${input.phone ? 'Provided' : 'Not provided'}`,
        `Product Interest: ${input.product_interest || 'N/A'}`,
        `Lead Source: ${input.source_name || 'N/A'}`,
        ragContext ? `\n[Company RAG Knowledge Base Context]:\n${ragContext}` : ''
      ].filter(Boolean).join('\n');

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.APP_URL || 'https://leadrescueai.xilxil.com',
          'X-Title': 'Lead Rescue AI',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) throw new Error('Empty response from AI model');

      // Strip markdown code fences if present
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      result = {
        score: Math.min(100, Math.max(0, parseInt(parsed.score, 10) || 0)),
        status: ['Hot', 'Warm', 'Cold'].includes(parsed.status) ? parsed.status : 'Cold',
        analysis_data: {
          customer_needs: parsed.analysis_data?.customer_needs || 'N/A',
          budget: parsed.analysis_data?.budget || 'N/A',
          buying_intent: parsed.analysis_data?.buying_intent || 'N/A',
          urgency: parsed.analysis_data?.urgency || 'Low',
          location: parsed.analysis_data?.location || 'Unknown',
          product_interest: parsed.analysis_data?.product_interest || input.product_interest || 'General Inquiry',
          summary: parsed.analysis_data?.summary || 'AI analysis completed.',
        },
        ai_model_used: OPENROUTER_MODEL,
      };
    } catch (e) {
      console.error('[qualification] AI API call failed, falling back to heuristic engine:', e);
      result = heuristicQualification(input);
    }
  } else {
    console.log('[qualification] OPENROUTER_API_KEY not set — using heuristic engine');
    result = heuristicQualification(input);
  }

  // Persist results
  await run('DELETE FROM lead_qualification_results WHERE lead_id = ?', [input.leadId]);

  await run(
    `INSERT INTO lead_qualification_results (id, lead_id, analysis_data, qualification_score, qualification_status, ai_model_used, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      crypto.randomUUID(),
      input.leadId,
      JSON.stringify(result.analysis_data),
      result.score,
      result.status,
      result.ai_model_used,
    ]
  );

  // Update lead record
  await run(
    `UPDATE leads SET qualification_score = ?, qualification_status = ?, updated_at = NOW() WHERE id = ?`,
    [result.score, result.status, input.leadId]
  );

  // Fetch lead for notification
  const lead = await get<{ organization_id: string; assigned_to_user_id: string; name: string }>(
    'SELECT organization_id, assigned_to_user_id, name FROM leads WHERE id = ?',
    [input.leadId]
  );

  if (lead && result.status === 'Hot') {
    const ownerObj = await get<{ owner_user_id: string }>(
      'SELECT owner_user_id FROM organizations WHERE id = ?',
      [lead.organization_id]
    );
    const notifyUserId = lead.assigned_to_user_id || ownerObj?.owner_user_id;

    if (notifyUserId) {
      await run(
        `INSERT INTO notifications (id, user_id, organization_id, type, message, related_entity_id, related_entity_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          crypto.randomUUID(),
          notifyUserId,
          lead.organization_id,
          'NEW_HOT_LEAD',
          `🔥 NEW HOT LEAD: ${lead.name || 'New Lead'} qualified with score ${result.score}/100 — immediate follow-up recommended!`,
          input.leadId,
          'Lead',
        ]
      );
    }
  }

  return result;
}

// ─── Heuristic Fallback (no API key required) ────────────────────────────────

function heuristicQualification(input: LeadQualificationInput): QualificationResult {
  const text =
    `${input.name || ''} ${input.company || ''} ${input.product_interest || ''} ${input.source_name || ''}`.toLowerCase();

  let score = 40;

  // High-intent signals
  if (
    text.includes('enterprise') ||
    text.includes('commercial') ||
    text.includes('luxury') ||
    text.includes('immediate') ||
    text.includes('urgent') ||
    text.includes('asap') ||
    text.includes('purchase') ||
    text.includes('buy') ||
    text.includes('lease')
  ) {
    score += 35;
  } else if (
    text.includes('solutions') ||
    text.includes('services') ||
    text.includes('quote') ||
    text.includes('pricing') ||
    text.includes('cost') ||
    text.includes('demo')
  ) {
    score += 20;
  }

  // Business email = more credible
  if (
    input.email &&
    !input.email.includes('gmail') &&
    !input.email.includes('yahoo') &&
    !input.email.includes('hotmail') &&
    !input.email.includes('outlook.com')
  ) {
    score += 10;
  }

  // Has phone = reachable
  if (input.phone) score += 5;

  // Source bonus
  if (input.source_name?.toLowerCase().includes('facebook') || input.source_name?.toLowerCase().includes('whatsapp')) {
    score += 5;
  }

  score = Math.min(97, Math.max(20, score));

  const status: 'Hot' | 'Warm' | 'Cold' = score >= 75 ? 'Hot' : score >= 45 ? 'Warm' : 'Cold';

  const budgetStr = score > 80 ? 'High ($50,000+)' : score > 55 ? 'Medium ($10,000–$50,000)' : 'Low / Unqualified';
  const intentStr =
    status === 'Hot' ? 'Strong — Immediate Purchase Intent (0–30 days)' : status === 'Warm' ? 'Active Evaluation Phase' : 'Early Research / Low Intent';

  return {
    score,
    status,
    analysis_data: {
      customer_needs: `Interest in ${input.product_interest || 'products/services'} at ${input.company || 'their organization'}. Requires follow-up to qualify needs.`,
      budget: budgetStr,
      buying_intent: intentStr,
      urgency: status === 'Hot' ? 'High' : status === 'Warm' ? 'Moderate' : 'Low',
      location: 'Unknown',
      product_interest: input.product_interest || 'General Inquiry',
      summary: `Lead qualified as ${status} (${score}/100) using heuristic analysis. Source: ${input.source_name || 'Manual'}. Recommend immediate personalized outreach for best conversion.`,
    },
    ai_model_used: 'lead-rescue-heuristic-v2',
  };
}
