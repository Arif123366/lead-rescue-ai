import { get, query } from '../db/db';
import { retrieveRagContext } from './rag';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = `You are Lead Rescue AI's WhatsApp Auto-Responder Agent.
Your goal is to provide fast, warm, helpful, and high-converting WhatsApp replies to sales leads.

Guidelines:
- Be concise: 1 to 3 short sentences max (optimized for mobile WhatsApp messaging).
- Be polite, professional, yet approachable.
- Answer the customer's query directly using the provided Company Knowledge Base context if available.
- Include a clear, subtle call to action (e.g. asking a clarifying question, offering a quick call, or booking a demo).
- Do NOT use markdown headers or bold text unless appropriate for WhatsApp formatting. Do not output quotes.`;

export interface GenerateWhatsAppResponseInput {
  leadId: string;
  organizationId: string;
  incomingMessage: string;
  leadName?: string;
}

export async function generateWhatsAppResponse(input: GenerateWhatsAppResponseInput): Promise<string> {
  // 1. Retrieve RAG Knowledge Base Context
  let ragContext = '';
  try {
    ragContext = await retrieveRagContext(input.organizationId, input.incomingMessage);
  } catch (err) {
    console.warn('[whatsappBot] RAG retrieval warning:', err);
  }

  // 2. Retrieve recent message history for context
  let historySummary = '';
  try {
    const history = await query<{ direction: string; message_content: string }>(
      `SELECT direction, COALESCE(message_content, message) as message_content
       FROM follow_up_messages
       WHERE lead_id = ?
       ORDER BY created_at DESC LIMIT 4`,
      [input.leadId]
    );

    if (history.length > 0) {
      historySummary = history
        .reverse()
        .map((h) => `${h.direction === 'Inbound' ? 'Customer' : 'Agent'}: ${h.message_content}`)
        .join('\n');
    }
  } catch (err) {
    console.warn('[whatsappBot] History fetch warning:', err);
  }

  if (OPENROUTER_API_KEY) {
    try {
      const userMessage = [
        `Lead Name: ${input.leadName || 'Customer'}`,
        historySummary ? `\n[Recent Conversation History]:\n${historySummary}` : '',
        ragContext ? `\n[Company RAG Knowledge Base]:\n${ragContext}` : '',
        `\n[Latest Customer Message]:\n${input.incomingMessage}`,
      ].filter(Boolean).join('\n');

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.APP_URL || 'https://leadrescueai.xilxil.com',
          'X-Title': 'Lead Rescue AI WhatsApp Bot',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.5,
          max_tokens: 250,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const responseText = data.choices?.[0]?.message?.content?.trim();

      if (responseText) {
        return responseText.replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.error('[whatsappBot] AI call failed, using smart fallback response:', err);
    }
  }

  // Fallback template
  return `Hi ${input.leadName || 'there'}! Thank you for reaching out to us. We've received your message and our team is reviewing your request right now. How soon are you looking to get started?`;
}

export default { generateWhatsAppResponse };
