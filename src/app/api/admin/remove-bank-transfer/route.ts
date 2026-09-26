import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();

  try {
    // Get current settings
    const { data: settings, error: fetchError } = await service
      .from('settings')
      .select('payment_accounts')
      .eq('id', 1)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!settings || !settings.payment_accounts) {
      return NextResponse.json({ error: 'No payment accounts found' }, { status: 404 });
    }

    // Filter out Bank Transfer accounts
    const filteredAccounts = settings.payment_accounts.filter(
      (account: any) => !account.payment_method_name?.toLowerCase().includes('bank transfer')
    );

    // Update settings
    const { data, error: updateError } = await service
      .from('settings')
      .update({
        payment_accounts: filteredAccounts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bank Transfer payment account removed successfully',
      settings: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
