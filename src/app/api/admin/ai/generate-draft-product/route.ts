import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { GoogleGenAI } from '@google/genai';
import { createServiceClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface GeneratedProductResponse {
  title: string;
  short_description: string;
  description: string;
  key_features: Array<{
    icon: string;
    title: string;
    subtitle: string;
  }>;
  specifications: Array<{
    label: string;
    value: string;
  }>;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const productName = (body.productName || '').trim();
    const categoryName = (body.categoryName || '').trim();

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name or model is required' },
        { status: 400 }
      );
    }

    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
    ].filter(Boolean) as string[];

    // Generate product information using AI
    let generatedData: GeneratedProductResponse = {
      title: productName,
      short_description: '',
      description: '',
      key_features: [],
      specifications: [],
    };
    let usedApiKey: string | null = null;
    
    if (apiKeys.length === 0) {
      // Fallback response if GEMINI_API_KEY is not set
      generatedData = {
        title: productName,
        short_description: `High-quality ${productName} with premium performance, durable build, and official warranty.`,
        description: `Upgrade your tech lifestyle with the all-new ${productName}.\n\n` +
          `Key Highlights:\n` +
          `• Premium build quality with modern ergonomics\n` +
          `• Long-lasting battery efficiency and fast charging support\n` +
          `• Universal compatibility with Android, iOS, and other devices\n` +
          `• 100% original product backed by 7-day replacement warranty nationwide in Pakistan.\n\n` +
          `What's in the box:\n` +
          `• 1 x ${productName}\n` +
          `• 1 x Charging / Connection Cable\n` +
          `• 1 x User Manual`,
        key_features: [
          { icon: '⚡', title: 'Fast & Efficient', subtitle: 'Optimized performance' },
          { icon: '🔋', title: 'Extended Battery', subtitle: 'All-day reliable battery life' },
          { icon: '💎', title: 'Premium Build', subtitle: 'Durable and sleek design' },
          { icon: '🚚', title: 'COD Available', subtitle: 'Fast delivery across Pakistan' },
        ],
        specifications: [
          { label: 'Model', value: productName },
          { label: 'Compatibility', value: 'Android / iOS / Windows' },
          { label: 'Connectivity', value: 'Bluetooth / Wireless' },
          { label: 'Warranty', value: '7 Days Checking Warranty' },
        ],
      };
    } else {
      const systemInstruction = `You are an expert e-commerce catalog specialist for "STH Gadgets" (a top mobile accessories and tech store in Pakistan).
When given a gadget or accessory model name (and optional category), generate comprehensive, realistic, and highly engaging product data for an online store.
Return ONLY valid JSON matching this exact structure:
{
  "title": "Clean, official, appealing product title",
  "short_description": "Catchy 1-2 sentence hook highlighting key selling point and appeal (e.g. deep bass, AMOLED display, or fast charging).",
  "description": "Engaging detailed product description (approx 100-200 words) with bullet points, emojis (⚡, 🔋, 🎧, 🔊, 💧), features overview, and Box Contents list.",
  "key_features": [
    { "icon": "⚡", "title": "Feature 1 Title (max 4 words)", "subtitle": "Feature 1 Subtitle (max 8 words)" },
    { "icon": "🔋", "title": "Feature 2 Title", "subtitle": "Feature 2 Subtitle" },
    { "icon": "🎧", "title": "Feature 3 Title", "subtitle": "Feature 3 Subtitle" },
    { "icon": "💎", "title": "Feature 4 Title", "subtitle": "Feature 4 Subtitle" }
  ],
  "specifications": [
    { "label": "Model", "value": "Exact model" },
    { "label": "Bluetooth Version", "value": "e.g. v5.3" },
    { "label": "Battery Capacity", "value": "Realistic mAh or hours" },
    { "label": "Charging Time", "value": "e.g. 1.5 - 2 Hours" },
    { "label": "Playtime / Battery Life", "value": "e.g. 24-30 Hours with Case" },
    { "label": "Water Resistance", "value": "e.g. IPX4 / IP67" },
    { "label": "Charging Port", "value": "Type-C" },
    { "label": "Warranty", "value": "7 Days Replacement" }
  ]
}

Guidelines:
- Keep specs realistic to typical real-world specifications for this gadget model.
- If it's a smartwatch, include Display Size, Sensors, Battery, Waterproofing.
- If it's earbuds, include Bluetooth, Battery, Drivers, ENC/ANC, Playtime.
- If it's a power bank, include Capacity, Max Output Wattage, Ports.
- Write natural, high-converting English suitable for Pakistani online shoppers.
- Do NOT output markdown code blocks (no \`\`\`json). Return raw JSON only.`;

      const userPrompt = `Product: ${productName}${categoryName ? ` | Category: ${categoryName}` : ''}`;

      let lastError: Error | null = null;
      let generatedSuccessfully = false;

      // Try each API key with fallback
      for (const apiKey of apiKeys) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          
          let response;
          try {
            response = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: userPrompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.2,
                maxOutputTokens: 1500,
              },
            });
          } catch {
            response = await ai.models.generateContent({
              model: 'gemini-3.5-flash-lite',
              contents: userPrompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.2,
                maxOutputTokens: 1500,
              },
            });
          }

          const responseText = response.text?.trim() || '{}';
          generatedData = JSON.parse(responseText);
          generatedSuccessfully = true;
          usedApiKey = apiKey;
          break; // Success - exit the loop
        } catch (error: any) {
          lastError = error;
          console.error(`Failed with API key, trying next...`, error.message);
          continue; // Try next API key
        }
      }

      if (!generatedSuccessfully) {
        throw lastError || new Error('All API keys failed');
      }
    }

    // Create the product as a draft in the database
    const service = createServiceClient();

    // Get the next sort order
    const { data: lastProduct } = await service
      .from('products')
      .select('sort_order')
      .order('sort_order', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const nextSortOrder = (Number(lastProduct?.sort_order) || 0) + 1;

    // Generate unique slug
    const baseSlug = slugify(generatedData.title || productName);
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

    // Prepare product data - create as DRAFT (active: false)
    const productData = {
      name: generatedData.title || productName,
      slug: candidateSlug,
      description: generatedData.description || '',
      short_description: generatedData.short_description || '',
      specifications: generatedData.specifications || [],
      key_features: generatedData.key_features || [],
      price: 0, // Admin will set this later
      purchase_price: 0, // Admin will set this later
      wholesale_price: null,
      stock_status: 'out_of_stock', // Will be updated when inventory is added
      featured: false,
      best_seller: false,
      new_arrival: true,
      active: false, // DRAFT status - not visible to public
      sort_order: nextSortOrder,
    };

    // Insert the product
    const { data: product, error } = await service
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error('Error creating draft product:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create draft product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      product,
      generatedData,
      source: usedApiKey ? 'gemini' : 'fallback'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error generating and creating draft product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate and create draft product' },
      { status: 500 }
    );
  }
}
