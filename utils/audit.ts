import { createClient } from './supabase/client';

export type AuditSeverity = 'info' | 'warning' | 'critical';

interface LogActionProps {
  action: string;
  resourceType: string;
  resourceId?: string;
  details: string;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
}

export async function logAction({
  action,
  resourceType,
  resourceId,
  details,
  metadata = {},
  severity = 'info'
}: LogActionProps) {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('copropriete_id')
      .eq('id', user.id)
      .single();

    if (!profile?.copropriete_id) return;

    await supabase.from('audit_logs').insert({
      copropriete_id: profile.copropriete_id,
      user_id: user.id,
      action: action.toUpperCase(),
      resource_type: resourceType.toLowerCase(),
      resource_id: resourceId,
      details: details,
      metadata: {
        ...metadata,
        browser: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      },
      severity: severity
    });
  } catch (err) {
    console.error("Audit System Error:", err);
  }
}
