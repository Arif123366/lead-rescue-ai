import { z } from 'zod';

// ── Auth Schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
});

// ── Lead Schemas ──────────────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required').max(255),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  company: z.string().max(255).optional().or(z.literal('')),
  product_interest: z.string().max(500).optional().or(z.literal('')),
  source_id: z.string().uuid().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
  deal_value: z.number().nonnegative().optional().nullable(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().max(50).optional().or(z.literal('')).nullable(),
  company: z.string().max(255).optional().or(z.literal('')).nullable(),
  product_interest: z.string().max(500).optional().or(z.literal('')).nullable(),
  assigned_to_user_id: z.string().uuid().optional().nullable(),
  deal_value: z.number().nonnegative().optional().nullable(),
  reason_for_loss: z.string().max(1000).optional().nullable(),
  opt_out_communications: z.boolean().optional(),
});

export const importLeadsSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.any()))
    .min(1, 'At least one row is required')
    .max(500, 'Maximum 500 leads per import batch'),
});

// ── Team / Org Schemas ────────────────────────────────────────────────────────

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['Sales Representative', 'Marketing Manager', 'Organization Owner']),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
});

// ── CRM Schemas ───────────────────────────────────────────────────────────────

export const createStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(100),
  order_index: z.number().int().nonnegative(),
  is_initial: z.boolean().optional(),
  is_final_won: z.boolean().optional(),
  is_final_lost: z.boolean().optional(),
});

export const moveLeadSchema = z.object({
  lead_id: z.string().uuid('Invalid lead ID'),
  stage_id: z.string().uuid('Invalid stage ID'),
  deal_value: z.number().nonnegative().optional(),
  reason_for_loss: z.string().max(1000).optional(),
});

// ── Follow-Up Schemas ─────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  message_body: z.string().min(10, 'Message body must be at least 10 characters').max(5000),
  channel: z.enum(['Email', 'WhatsApp']),
  trigger_conditions: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().optional(),
});

export const sendFollowUpSchema = z.object({
  lead_id: z.string().uuid('Invalid lead ID'),
  template_id: z.string().uuid().optional(),
  custom_message: z.string().max(5000).optional(),
  channel: z.enum(['Email', 'WhatsApp']).optional(),
});

// ── Appointment Schemas ───────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  lead_id: z.string().uuid('Invalid lead ID'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

// ── Lead Source Schemas ───────────────────────────────────────────────────────

export const createLeadSourceSchema = z.object({
  name: z.string().min(1, 'Source name is required').max(100),
  type: z.enum(['Website Form', 'WhatsApp', 'Facebook Leads', 'Manual', 'Other']),
  configuration: z.record(z.string(), z.any()).optional(),
});

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Parse and validate a request body against a Zod schema.
 * Returns { data } on success or { error } on failure.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { data: result.data, error: null };
  }
  const messages = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { data: null, error: messages };
}
