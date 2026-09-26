import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { revalidateTag } from 'next/cache';
import { slugify } from '@/lib/utils';

const schema = z.object({ name: z.string().min(1).max(200), slug: z.string().optional(), category_id: z.string().uuid().nullable().optional(), brand: z.string().nullable().optional(), description: z.string().optional().default(''), common_specs: z.array(z.object({label:z.string(),value:z.string()})).optional().default([]), common_features: z.array(z.object({icon:z.string().optional(),title:z.string(),subtitle:z.string().optional()})).optional().default([]), warranty: z.string().nullable().optional(), thumbnail_url: z.string().nullable().optional(), is_active: z.boolean().optional().default(true), sort_order: z.number().int().optional().default(0) });
export async function GET() {
  const admin = await requireAdmin();
  let query = createServiceClient().from('product_series').select('*, category:categories(*)').order('sort_order');
  if (!admin) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ series: [] });
  const series = await Promise.all((data || []).map(async (s) => { const {data: ms}=await createServiceClient().from('products').select('price').eq('series_id',s.id).eq('active',true); return {...s,model_count:ms?.length||0,min_price:ms?.length?Math.min(...ms.map(x=>Number(x.price))):0}; }));
  return NextResponse.json({ series });
}
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message},{status:400});
  const {name,slug,...rest}=parsed.data; const {data,error}=await createServiceClient().from('product_series').insert({name,slug:slug?.trim()||slugify(name),...rest}).select('*').single();
  if(error)return NextResponse.json({error:error.message},{status:400}); revalidateTag('series', 'max'); return NextResponse.json({series:data},{status:201});
}
