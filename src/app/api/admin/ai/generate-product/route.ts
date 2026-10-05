import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { GoogleGenAI } from '@google/genai';

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
      '',
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      // Fallback response if GEMINI_API_KEY is not set
      const fallback: GeneratedProductResponse = {
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
      return NextResponse.json({ data: fallback, source: 'fallback' });
    }

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
    let json: any;

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ];

    // Try each API key and model with graceful fallback
    for (const apiKey of apiKeys) {
      if (generatedSuccessfully) break;
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        for (const model of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: userPrompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.2,
                maxOutputTokens: 1500,
              },
            });

            const responseText = response.text?.trim() || '{}';
            json = JSON.parse(responseText);
            if (json && (json.title || json.description)) {
              generatedSuccessfully = true;
              break; // Success - break model loop
            }
          } catch (modelErr: any) {
            console.warn(`Model ${model} failed, trying next candidate...`, modelErr.message);
            lastError = modelErr;
          }
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Failed with API key, trying next...`, error.message);
        continue;
      }
    }

    if (!generatedSuccessfully || !json) {
      console.warn('AI generation unavailable, returning high quality fallback product details');
      const fallback: GeneratedProductResponse = {
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
      return NextResponse.json({ data: fallback, source: 'fallback' });
    }

    return NextResponse.json({ data: json, source: 'gemini' });
  } catch (error: any) {
    console.error('Error generating product with AI:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate product details' },
      { status: 500 }
    );
  }
}
