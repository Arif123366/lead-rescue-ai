import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db/db';
import { hashPassword, createToken, setSessionCookie } from '@/lib/auth/auth';
import { validate, signupSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = validate(signupSchema, body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid request' }, { status: 422 });

    const { email, password, name, organization_name } = data;

    // Check if email already exists
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
    }

    // Get the Starter plan (lowest tier)
    const starterPlan = await get<{ id: string }>(`SELECT id FROM subscription_plans WHERE name = 'Starter' LIMIT 1`);
    if (!starterPlan) {
      return NextResponse.json({ error: 'Subscription plans not configured. Please run database seed.' }, { status: 500 });
    }

    const orgId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // Create organization (owner_user_id set after user creation)
    await run(
      `INSERT INTO organizations (id, name, owner_user_id, subscription_plan_id, current_lead_count)
       VALUES (?, ?, ?, ?, 0)`,
      [orgId, organization_name.trim(), userId, starterPlan.id]
    );

    // Create user
    const passwordHash = hashPassword(password);
    await run(
      `INSERT INTO users (id, email, password_hash, name, organization_id, role, status)
       VALUES (?, ?, ?, ?, ?, 'Organization Owner', 'Active')`,
      [userId, email.toLowerCase(), passwordHash, name.trim(), orgId]
    );

    // Create default CRM stages
    const stages = [
      { name: 'New Lead', order_index: 0, is_initial: 1, is_final_won: 0, is_final_lost: 0 },
      { name: 'Contacted', order_index: 1, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Qualified', order_index: 2, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Proposal Sent', order_index: 3, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Negotiation', order_index: 4, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Closed Won', order_index: 5, is_initial: 0, is_final_won: 1, is_final_lost: 0 },
      { name: 'Closed Lost', order_index: 6, is_initial: 0, is_final_won: 0, is_final_lost: 1 },
    ];
    for (const stage of stages) {
      await run(
        `INSERT OR IGNORE INTO crm_stages (id, organization_id, name, order_index, is_initial, is_final_won, is_final_lost)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), orgId, stage.name, stage.order_index, stage.is_initial, stage.is_final_won, stage.is_final_lost]
      );
    }

    // Create default Manual lead source
    await run(
      `INSERT OR IGNORE INTO lead_sources (id, organization_id, name, type, configuration)
       VALUES (?, ?, 'Manual Entry', 'Manual', '{}')`,
      [crypto.randomUUID(), orgId]
    );

    // Issue session token
    const token = createToken({
      id: userId,
      email: email.toLowerCase(),
      name: name.trim(),
      organization_id: orgId,
      role: 'Organization Owner',
    });

    const response = NextResponse.json(
      { message: 'Account created successfully.', user_id: userId },
      { status: 201 }
    );
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
