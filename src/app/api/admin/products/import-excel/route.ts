import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import * as XLSX from 'xlsx';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import type { Specification, KeyFeature } from '@/types/database';

export const dynamic = 'force-dynamic';

// Helper to parse specifications text like "Bluetooth: 5.3; Battery: 300mAh" or JSON
function parseSpecifications(raw: any): Specification[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // Split by semicolon, newline, or pipe
  const items = trimmed.split(/[;\n\r|]+/).map((s) => s.trim()).filter(Boolean);
  const specs: Specification[] = [];
  for (const item of items) {
    if (item.includes(':')) {
      const [label, ...valParts] = item.split(':');
      specs.push({
        label: label.trim(),
        value: valParts.join(':').trim(),
      });
    } else if (item.includes('-')) {
      const [label, ...valParts] = item.split('-');
      specs.push({
        label: label.trim(),
        value: valParts.join('-').trim(),
      });
    }
  }
  return specs;
}

// Helper to parse key features text like "Fast Charging | LED Display | Touch Control"
function parseKeyFeatures(raw: any): KeyFeature[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const items = trimmed.split(/[|;\n\r]+/).map((s) => s.trim()).filter(Boolean);
  return items.map((title) => ({
    title,
    icon: '⚡',
  }));
}

// Helper to parse booleans from Yes/No, True/False, 1/0
function parseBoolean(val: any, defaultVal = false): boolean {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  return ['yes', 'true', '1', 'y', 'haan'].includes(s);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();

  let rawRows: any[] = [];

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  } else {
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.products)) {
      return NextResponse.json(
        { error: 'Invalid payload. Expected { products: Array }' },
        { status: 400 }
      );
    }
    rawRows = body.products;
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'No product rows found in the sheet' }, { status: 400 });
  }

  // Pre-fetch all categories for quick name/slug lookup
  const { data: categories } = await service.from('categories').select('id, name, slug');
  const catMap = new Map<string, string>(); // lowercased name/slug -> id
  (categories || []).forEach((c) => {
    catMap.set(c.slug.toLowerCase(), c.id);
    catMap.set(c.name.toLowerCase(), c.id);
  });

  // Get current highest sort_order
  const { data: lastProduct } = await service
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  let currentSortOrder = (Number(lastProduct?.sort_order) || 0) + 1;

  const insertedProducts: any[] = [];
  const errors: { row: number; name?: string; error: string }[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNum = idx + 2; // 1-indexed header is row 1

    // Extract fields (support various casing / header aliases)
    const name = String(row.name || row.Name || row['Product Name'] || row.title || '').trim();
    if (!name) {
      errors.push({ row: rowNum, error: 'Product name is required' });
      continue;
    }

    const price = Number(row.price || row.Price || row['Selling Price'] || 0);
    if (isNaN(price) || price < 0) {
      errors.push({ row: rowNum, name, error: 'Valid selling price is required' });
      continue;
    }

    const oldPriceRaw = row.old_price || row['Old Price'] || row['Original Price'] || row.cut_price;
    const old_price = oldPriceRaw ? Number(oldPriceRaw) : null;

    const purchasePriceRaw = row.purchase_price || row['Purchase Price'] || row['Cost Price'] || row.cost_price;
    const purchase_price = purchasePriceRaw ? Number(purchasePriceRaw) : 0;

    const wholesalePriceRaw = row.wholesale_price || row['Wholesale Price'] || row.wholesale;
    const wholesale_price = wholesalePriceRaw ? Number(wholesalePriceRaw) : null;

    // Calculate or take discount
    let discount = 0;
    if (row.discount || row.Discount) {
      discount = Number(row.discount || row.Discount) || 0;
    } else if (old_price && old_price > price) {
      discount = Math.round(((old_price - price) / old_price) * 100);
    }

    // Category matching
    const catInput = String(row.category || row.Category || row['Category Name'] || row.category_id || '').trim();
    let category_id: string | null = null;
    if (catInput) {
      const lower = catInput.toLowerCase();
      if (catMap.has(lower)) {
        category_id = catMap.get(lower)!;
      } else {
        // Create new category automatically if not found
        try {
          const newSlug = slugify(catInput) || `cat-${Date.now()}`;
          const { data: newCat } = await service
            .from('categories')
            .insert({ name: catInput, slug: newSlug, active: true })
            .select('id, name, slug')
            .single();
          if (newCat) {
            category_id = newCat.id;
            catMap.set(newCat.slug.toLowerCase(), newCat.id);
            catMap.set(newCat.name.toLowerCase(), newCat.id);
          }
        } catch {
          // ignore category creation failure
        }
      }
    }

    // Unique Slug generation
    const baseSlug = (slugify(name) || `prod-${Date.now()}`).toLowerCase();
    let candidateSlug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existingSlug } = await service
        .from('products')
        .select('id')
        .eq('slug', candidateSlug)
        .maybeSingle();

      if (!existingSlug) break;
      counter++;
      candidateSlug = `${baseSlug}-${counter}`;
    }

    // Stock Status
    const rawStock = String(row.stock_status || row['Stock Status'] || row.stock || 'in_stock').trim().toLowerCase();
    let stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (rawStock.includes('out') || rawStock === '0') stock_status = 'out_of_stock';
    else if (rawStock.includes('low')) stock_status = 'low_stock';

    // Descriptions
    const short_description = String(row.short_description || row['Short Description'] || '').trim();
    const description = String(row.description || row.Description || row.details || '').trim();

    // Sku & Model Number
    const sku = String(row.sku || row.SKU || row['Model Number'] || '').trim() || null;
    const model_number = String(row.model_number || row['Model Number'] || '').trim() || null;

    // Specs & Features
    const specifications = parseSpecifications(row.specifications || row.Specifications || row.specs);
    const key_features = parseKeyFeatures(row.key_features || row['Key Features'] || row.features);

    // Badges & Flags
    const featured = parseBoolean(row.featured || row.Featured);
    const best_seller = parseBoolean(row.best_seller || row['Best Seller'] || row.bestseller);
    const new_arrival = parseBoolean(row.new_arrival || row['New Arrival'] || row.new, true);
    const free_delivery = parseBoolean(row.free_delivery || row['Free Delivery']);

    // CRITICAL USER CONSTRAINT: Always save imported products as DRAFT (active: false)!
    const active = false;

    const newProductPayload: Record<string, any> = {
      name,
      slug: candidateSlug,
      price,
      old_price,
      purchase_price,
      wholesale_price,
      discount,
      category_id,
      stock_status,
      short_description,
      description,
      sku,
      model_number,
      specifications,
      key_features,
      featured,
      best_seller,
      new_arrival,
      free_delivery,
      active, // GUARANTEED DRAFT!
      sort_order: currentSortOrder++,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into database with column error fallback
    let { data: inserted, error: insertError } = await service
      .from('products')
      .insert(newProductPayload)
      .select('id, name, slug, price, active, created_at')
      .single();

    if (insertError && insertError.message?.includes('column')) {
      const fallbackPayload = { ...newProductPayload };
      delete fallbackPayload.model_number;
      delete fallbackPayload.purchase_price;
      delete fallbackPayload.wholesale_price;
      delete fallbackPayload.free_delivery;
      delete fallbackPayload.key_features;

      const retry = await service
        .from('products')
        .insert(fallbackPayload)
        .select('id, name, slug, price, active, created_at')
        .single();

      if (!retry.error) {
        inserted = retry.data;
        insertError = null;
      }
    }

    if (insertError || !inserted) {
      errors.push({
        row: rowNum,
        name,
        error: insertError?.message || 'Failed to insert product',
      });
    } else {
      insertedProducts.push(inserted);
    }
  }

  // Revalidate store caches
  (revalidateTag as any)('products');
  (revalidateTag as any)('categories');
  revalidatePath('/', 'layout');
  revalidatePath('/products');
  revalidatePath('/admin/products');

  return NextResponse.json({
    success: true,
    total_processed: rawRows.length,
    imported_count: insertedProducts.length,
    products: insertedProducts,
    errors,
  });
}
