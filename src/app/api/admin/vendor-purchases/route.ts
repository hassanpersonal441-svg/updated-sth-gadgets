import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEFAULT_VOLTIX_PROFILE = {
  id: 'voltix-mobile-v1',
  name: 'Voltix Mobile',
  logo_url: '/images/logo.png',
  phone: '+92 348 9593671',
  email: 'voltix@sthgadgets.com',
  address: 'Mobile Market, Lahore, Pakistan',
  notes: 'Primary Wholesale Mobile & Accessories Vendor for STH Gadgets',
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const searchParams = req.nextUrl.searchParams;
  const statusFilter = searchParams.get('status') || '';
  const search = searchParams.get('search')?.trim() || '';

  try {
    // 1. Fetch Voltix Vendor Profile
    let vendorProfile = DEFAULT_VOLTIX_PROFILE;
    const { data: profData } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('name', 'Voltix Mobile')
      .maybeSingle();

    if (profData) {
      vendorProfile = { ...DEFAULT_VOLTIX_PROFILE, ...profData };
    }

    // 2. Fetch Vendor Purchases
    let query = supabase.from('vendor_purchases').select('*').order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,product_name.ilike.%${search}%`);
    }

    const { data: purchasesData, error: purchasesErr } = await query;

    if (purchasesErr) {
      // If table doesn't exist yet in schema cache, return default profile & empty array cleanly
      return NextResponse.json({
        purchases: [],
        profile: vendorProfile,
        summary: { pendingCount: 0, totalCost: 0, pendingCost: 0 },
        tableMissing: true,
      });
    }

    const purchases = purchasesData || [];
    const pendingCount = purchases.filter((p) => p.status === 'pending').length;
    const totalCost = purchases.reduce((sum, p) => sum + (Number(p.wholesale_cost) || 0) * (Number(p.quantity) || 1), 0);
    const pendingCost = purchases
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (Number(p.wholesale_cost) || 0) * (Number(p.quantity) || 1), 0);

    return NextResponse.json({
      purchases,
      profile: vendorProfile,
      summary: { pendingCount, totalCost, pendingCost },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error loading vendor purchases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();

  try {
    const body = await req.json();
    const { order_number, product_name, quantity, wholesale_cost, status, purchase_date, notes } = body;

    if (!product_name || !product_name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const recordToInsert = {
      vendor_name: 'Voltix Mobile',
      order_number: (order_number || 'STH-GENERAL').trim().toUpperCase(),
      product_name: product_name.trim(),
      quantity: Math.max(1, Number(quantity) || 1),
      wholesale_cost: Math.max(0, Number(wholesale_cost) || 0),
      status: status === 'purchased' ? 'purchased' : 'pending',
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      notes: notes ? notes.trim() : null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('vendor_purchases').insert(recordToInsert).select().single();

    if (error) {
      if (
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('vendor_purchases')
      ) {
        return NextResponse.json(
          {
            error:
              "The table 'vendor_purchases' is not yet created in your Supabase database schema cache. Please run the SQL snippet in Supabase SQL Editor.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, purchase: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating vendor purchase record' }, { status: 500 });
  }
}
