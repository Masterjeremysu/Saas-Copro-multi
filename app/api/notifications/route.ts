import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestBuckets = new Map<string, { count: number; windowStart: number }>();

function consumeRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request });
    const authSupabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { copropriete_id, categorie, titre, urgence } = await request.json();
    if (!copropriete_id || !categorie || !titre || !urgence) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Prefer service-role for stable server-side reads; fallback to auth client if env is missing.
    const dbSupabase = adminSupabase ?? authSupabase;

    const { data: callerProfile, error: profileError } = await dbSupabase
      .from('profiles')
      .select('copropriete_id')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      return NextResponse.json({ error: 'Caller profile not found' }, { status: 403 });
    }

    if (callerProfile.copropriete_id !== copropriete_id) {
      return NextResponse.json({ error: 'Forbidden for this copropriete' }, { status: 403 });
    }

    const limiterKey = `${user.id}:${copropriete_id}`;
    const allowed = consumeRateLimit(limiterKey);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please retry in a minute.' },
        { status: 429 }
      );
    }

    const { data: artisans, error: artisansError } = await dbSupabase
      .from('profiles')
      .select('email, prenom, nom')
      .eq('copropriete_id', copropriete_id)
      .eq('role', 'artisan')
      .eq('specialite', categorie);

    if (artisansError) {
      throw artisansError;
    }

    if (!artisans || artisans.length === 0) {
      return NextResponse.json(
        { message: 'No artisan found for this category.' },
        { status: 200 }
      );
    }

    for (const artisan of artisans) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 24px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 20px;">CoproSync: New Intervention</h1>
          </div>
          <div style="padding: 32px; color: #1e293b;">
            <p>Hello <strong>${artisan.prenom}</strong>,</p>
            <p>A new request needs your expertise:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 24px 0;">
              <p style="margin: 4px 0;"><strong>Category:</strong> ${String(categorie).toUpperCase()}</p>
              <p style="margin: 4px 0;"><strong>Urgency:</strong> ${String(urgence).toUpperCase()}</p>
              <p style="margin: 4px 0;"><strong>Subject:</strong> ${titre}</p>
            </div>
            <p>Please log in to your mobile workspace to schedule the intervention.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/tickets" 
               style="display: block; background-color: #4f46e5; color: white; padding: 16px; text-align: center; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 32px;">
              View ticket on mobile
            </a>
          </div>
        </div>
      `;

      if (resend) {
        await resend.emails.send({
          from: 'CoproSync <onboarding@resend.dev>',
          to: artisan.email,
          subject: `${String(urgence).toUpperCase()}: ${titre}`,
          html: emailHtml,
        });
      } else {
        console.log(`[SIMULATION] Notification email to: ${artisan.email} | Subject: ${titre}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: resend
          ? 'Notification emails sent.'
          : 'Email simulation completed (set RESEND_API_KEY for real sending).',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Notifications API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
