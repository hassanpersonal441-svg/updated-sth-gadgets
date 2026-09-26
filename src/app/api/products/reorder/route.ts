import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const reorderSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A valid product order is required' }, { status: 400 });

  const service = createServiceClient();
  const updates = parsed.data.productIds.map((id, sortOrder) =>
    service.from('products').update({ sort_order: sortOrder }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  try {
    (revalidateTag as any)('products');
    revalidatePath('/', 'page');
    revalidatePath('/', 'layout');
    revalidatePath('/products', 'page');
    revalidatePath('/admin/products', 'page');
  } catch (err) {
    console.error('Revalidation error:', err);
  }

  return NextResponse.json({ success: true });
}
