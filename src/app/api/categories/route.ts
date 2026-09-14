import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  image_url: z.string().url().nullable().optional(),
  description: z.string().optional().default(''),
  active: z.boolean().default(true),
});

export async function GET() {
  const service = createServiceClient();
  const { data, error } = await service.from('categories').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service.from('categories').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag('categories');
  revalidatePath('/');
  revalidatePath('/products');

  return NextResponse.json({ category: data }, { status: 201 });
}
