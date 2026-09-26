import { createClient } from '@/lib/supabase/server';
import SeriesCreateForm from '@/components/admin/SeriesCreateForm';
export default async function NewSeriesPage(){const db=await createClient();const {data:categories}=await db.from('categories').select('*').order('name');return <main><h1 className="mb-5 text-2xl font-bold text-silver-bright">Create Series</h1><SeriesCreateForm categories={categories||[]}/></main>}
