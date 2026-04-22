import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const isSignup = searchParams.get('signup') === '1';

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (isSignup && data.session && data.user) {
      await fetch(`${BASE}/v1/billing/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_user_id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
        }),
      }).catch(() => {});
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
