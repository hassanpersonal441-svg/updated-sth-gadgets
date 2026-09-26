import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  image_url: z.string().url().nullable().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = categoryUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service.from('categories').update(parsed.data).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  (revalidateTag as any)('categories');
  revalidatePath('/');
  revalidatePath('/products');

  return NextResponse.json({ category: data });
}

export async function DELETE(_req: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { error } = await service.from('categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  (revalidateTag as any)('categories');
  revalidatePath('/');
  revalidatePath('/products');

  return NextResponse.json({ ok: true });
}
