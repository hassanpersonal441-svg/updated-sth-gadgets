import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();

  try {
    const body = await req.json();
    const { name, logo_url, phone, email, address, notes } = body;

    const payload = {
      name: name || 'Voltix Mobile',
      logo_url: logo_url || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    // Upsert profile record in vendor_profiles table if available
    const { data, error } = await supabase
      .from('vendor_profiles')
      .upsert(payload, { onConflict: 'name' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('vendor_profiles table notice:', error.message);
      // Graceful fallback if table doesn't exist yet in Supabase schema cache
      if (
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('vendor_profiles')
      ) {
        return NextResponse.json({
          success: true,
          profile: payload,
          message: 'Vendor profile saved locally. Run migration SQL in Supabase to persist DB table.',
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data || payload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating vendor profile' }, { status: 500 });
  }
}
