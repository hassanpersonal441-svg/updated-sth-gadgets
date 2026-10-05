import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { GoogleGenAI } from '@google/genai';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface GenerateSeoRequest {
  name: string;
  categoryName?: string;
  description?: string;
  shortDescription?: string;
  specifications?: Array<{ label: string; value: string }>;
  keyFeatures?: Array<{ title: string; subtitle?: string }>;
  variants?: Array<{ variant_name: string }>;
  price?: number;
  existingSlug?: string;
  existingKeywords?: string;
}

interface SeoResponseData {
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  seo_slug: string;
  image_alt_text: string;
  meta_description: string;
}

// Deterministic, fact-grounded fallback generator that strictly never invents specs
function generateStrictFallbackSeo(data: GenerateSeoRequest): SeoResponseData {
  const pName = (data.name || '').trim();
  const cat = (data.categoryName || '').trim();
  const shortDesc = (data.shortDescription || '').trim();
  const priceStr = data.price && data.price > 0 ? ` at Rs. ${data.price.toLocaleString('en-PK')}` : '';

  // 1. SEO Title (target 50–60 chars)
  let title = pName;
  if (cat && !title.toLowerCase().includes(cat.toLowerCase())) {
    title = `${title} - ${cat}`;
  }
  if (!title.includes('STH Gadgets')) {
    title = `${title} | STH Gadgets`;
  }
  if (title.length > 65) {
    title = `${pName.slice(0, 50)} | STH Gadgets`;
  }

  // 2. SEO Description (target 120–160 chars)
  let desc = shortDesc;
  if (!desc) {
    const specSummary = (data.specifications || [])
      .filter((s) => s.label && s.value)
      .slice(0, 2)
      .map((s) => `${s.label}: ${s.value}`)
      .join(', ');
    desc = `Buy authentic ${pName}${cat ? ` (${cat})` : ''}${specSummary ? ` with ${specSummary}` : ''}${priceStr}. Nationwide Cash on Delivery across Pakistan at STH Gadgets.`;
  } else {
    desc = `${desc.replace(/\.$/, '')}${priceStr}. Fast nationwide delivery from STH Gadgets Pakistan.`;
  }
  if (desc.length > 160) {
    desc = desc.slice(0, 157) + '...';
  }

  // 3. SEO Keywords
  const keywordsSet = new Set<string>();
  if (pName) {
    keywordsSet.add(pName.toLowerCase());
    const words = pName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (words.length >= 2) {
      keywordsSet.add(words.slice(0, 2).join(' '));
    }
  }
  if (cat) {
    keywordsSet.add(cat.toLowerCase());
    keywordsSet.add(`${pName.toLowerCase()} ${cat.toLowerCase()}`);
  }
  (data.keyFeatures || []).forEach((kf) => {
    if (kf.title && kf.title.length < 25) {
      keywordsSet.add(kf.title.toLowerCase().trim());
    }
  });
  (data.specifications || []).slice(0, 3).forEach((s) => {
    if (s.value && s.value.length < 20) {
      keywordsSet.add(`${s.label.toLowerCase()}: ${s.value.toLowerCase()}`);
    }
  });
  keywordsSet.add('sth gadgets pakistan');

  // 4. SEO Slug
  const cleanSlug = data.existingSlug?.trim() ? slugify(data.existingSlug) : slugify(pName);

  // 5. Image Alt Text
  const altText = `${pName}${cat ? ` ${cat}` : ''} - Official STH Gadgets Pakistan`;

  // 6. Meta Description (120–160 chars, marketing-focused but strictly fact-accurate)
  let metaDesc = `Explore the official ${pName}${cat ? ` ${cat}` : ''} at STH Gadgets. 100% original product with 7-day replacement warranty and Cash on Delivery in Pakistan.`;
  if (metaDesc.length > 160) {
    metaDesc = metaDesc.slice(0, 157) + '...';
  }

  return {
    seo_title: title,
    seo_description: desc,
    seo_keywords: Array.from(keywordsSet).slice(0, 10),
    seo_slug: cleanSlug,
    image_alt_text: altText,
    meta_description: metaDesc,
  };
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: GenerateSeoRequest = await request.json();
    const productName = (body.name || '').trim();

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name/model is required to generate SEO' },
        { status: 400 }
      );
    }

    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      '',
    ].filter(Boolean) as string[];

    // Extract verified factual summary from provided product inputs
    const verifiedSpecsList = (body.specifications || [])
      .filter((s) => s.label?.trim() && s.value?.trim())
      .map((s) => `• ${s.label.trim()}: ${s.value.trim()}`)
      .join('\n');

    const verifiedFeaturesList = (body.keyFeatures || [])
      .filter((f) => f.title?.trim())
      .map((f) => `• ${f.title.trim()}${f.subtitle ? ` (${f.subtitle.trim()})` : ''}`)
      .join('\n');

    const variantsList = (body.variants || [])
      .map((v) => v.variant_name?.trim())
      .filter(Boolean)
      .join(', ');

    const productContext = `
PRODUCT INFORMATION PROVIDED:
- Product Title / Model: ${productName}
- Category: ${body.categoryName || 'Not specified'}
- Price: ${body.price ? `PKR ${body.price}` : 'Not specified'}
- Available Variants / Colors: ${variantsList || 'None specified'}
- Short Description: ${body.shortDescription || 'None provided'}
- Full Description: ${body.description ? body.description.slice(0, 1500) : 'None provided'}
- Key Features:
${verifiedFeaturesList || 'None provided'}
- Technical Specifications:
${verifiedSpecsList || 'None provided'}
- Current Slug: ${body.existingSlug || 'None'}
`.trim();

    const systemInstruction = `You are the SEO specialist and metadata optimization assistant for "STH Gadgets" (an authorized mobile accessories and tech store in Pakistan).

STRICT ACCURACY RULES:
1. Generate SEO content using ONLY the explicit product information provided in the input.
2. DO NOT invent, assume, infer, estimate, or hallucinate product specifications, features, compatibility, warranty terms, materials, performance, certifications, battery capacity, wattage, or dimensions.
3. If an item or specification is NOT in the provided product data, completely omit it.
4. Do not turn assumptions into facts. Do not add specifications simply because they are common for similar products.
5. Every factual statement in the generated SEO content must be 100% verified by the supplied product data.
6. Target Pakistani online searchers (mention Pakistan/PK or STH Gadgets where relevant for local SEO).
7. Return ONLY valid, parseable JSON conforming to this schema (no markdown, no backticks):

{
  "seo_title": "Concise, keyword-focused title (target 50–60 characters) ending with | STH Gadgets",
  "seo_description": "Search-engine-friendly description based strictly on verified product info (target 120–160 characters)",
  "seo_keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "seo_slug": "clean-lowercase-hyphenated-slug-no-duplicate-words",
  "image_alt_text": "Descriptive, accessible alt text representing the exact product for Google Images",
  "meta_description": "Marketing-focused yet strictly factually accurate meta description (target 120–160 characters)"
}`;

    let jsonResponse: SeoResponseData | null = null;
    let source: 'gemini' | 'fallback' = 'fallback';

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ];

    if (apiKeys.length > 0) {
      for (const apiKey of apiKeys) {
        if (jsonResponse) break;

        try {
          const ai = new GoogleGenAI({ apiKey });

          for (const model of candidateModels) {
            try {
              const result = await ai.models.generateContent({
                model,
                contents: `Generate optimized SEO metadata for this product following the strict factual rules:\n\n${productContext}`,
                config: {
                  systemInstruction,
                  responseMimeType: 'application/json',
                  temperature: 0.15,
                  maxOutputTokens: 1000,
                },
              });

              let raw = result.text?.trim() || '';
              // Strip code fences if returned
              if (raw.startsWith('```')) {
                raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
              }

              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                const keywords = Array.isArray(parsed.seo_keywords)
                  ? parsed.seo_keywords.map((k: any) => String(k).trim()).filter(Boolean)
                  : typeof parsed.seo_keywords === 'string'
                  ? parsed.seo_keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
                  : [];

                jsonResponse = {
                  seo_title: String(parsed.seo_title || `${productName} | STH Gadgets`).slice(0, 75),
                  seo_description: String(parsed.seo_description || '').slice(0, 180),
                  seo_keywords: keywords.slice(0, 12),
                  seo_slug: slugify(String(parsed.seo_slug || productName)),
                  image_alt_text: String(parsed.image_alt_text || `${productName} - STH Gadgets`).slice(0, 120),
                  meta_description: String(parsed.meta_description || parsed.seo_description || '').slice(0, 180),
                };
                source = 'gemini';
                break; // Found working model
              }
            } catch {
              // Try next model
              continue;
            }
          }
        } catch {
          // Try next API key
          continue;
        }
      }
    }

    // If all models/keys fail or unavailable, use strict deterministic fallback
    if (!jsonResponse) {
      jsonResponse = generateStrictFallbackSeo(body);
      source = 'fallback';
    }

    return NextResponse.json({
      success: true,
      data: jsonResponse,
      source,
    });
  } catch (err: any) {
    console.error('Error generating SEO with AI:', err);
    return NextResponse.json(
      { error: err.message || 'SEO generation failed. Your existing product information has not been changed.' },
      { status: 500 }
    );
  }
}
