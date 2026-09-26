import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
export default async function SeriesIndexPage() {
  const db=await createClient(); const {data:series}=await db.from('product_series').select('*, category:categories(name)').order('sort_order');
  return <main className="space-y-6"><header className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-silver-bright">Product Series</h1><p className="mt-1 text-silver-dim">Manage product families and their models.</p></div><Link className="rounded-xl bg-[#00C4CC] px-4 py-2 font-bold text-black" href="/admin/series/new">New Series</Link></header><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(series||[]).map((s:any)=><Link key={s.id} href={`/admin/series/${s.id}`} className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5"><h2 className="font-bold text-silver-bright">{s.name}</h2><p className="mt-1 text-sm text-silver-dim">{s.category?.name||'No category'} · {s.is_active?'Active':'Hidden'}</p></Link>)}</div>{!series?.length&&<p className="rounded-xl border border-slate-800 p-6 text-silver-dim">No series yet.</p>}</main>;
}
