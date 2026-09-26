import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

interface SpecItem {
  label: string;
  value: string;
}

// Fallback smart parser in case AI key is missing or fails
function fallbackParseSpecs(text: string): SpecItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const specs: SpecItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Markdown table row: | Label | Value |
    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2 && !parts[0].includes('---') && !parts[0].toLowerCase().includes('specification')) {
        specs.push({ label: parts[0], value: parts.slice(1).join(' - ') });
        continue;
      }
    }

    // Tab separated (Excel / Google Sheets / HTML table copy)
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        specs.push({ label: parts[0], value: parts.slice(1).join(' ') });
        continue;
      }
    }

    // Colon separated: "Battery: 5000mAh"
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      const label = line.slice(0, colonIdx).trim().replace(/^[-*•]\s*/, '');
      const value = line.slice(colonIdx + 1).trim();
      if (label && value) {
        specs.push({ label, value });
        continue;
      }
    }

    // Dash separated: "Battery - 5000mAh"
    const dashIdx = line.indexOf(' - ');
    if (dashIdx > 0 && dashIdx < line.length - 3) {
      const label = line.slice(0, dashIdx).trim().replace(/^[-*•]\s*/, '');
      const value = line.slice(dashIdx + 3).trim();
      if (label && value) {
        specs.push({ label, value });
        continue;
      }
    }
  }

  return specs;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawText = (body.text || '').trim();

    if (!rawText) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return smart regex parsed results if no Gemini API key configured
      const parsed = fallbackParseSpecs(rawText);
      return NextResponse.json({ specs: parsed, source: 'fallback_parser' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are a gadget specification parsing assistant. 
Extract technical and hardware specifications from the provided text into a clean JSON array of objects.
Each object must have "label" and "value" properties.
Rules:
- Standardize labels concisely (e.g., "Bluetooth Version", "Battery Capacity", "Charging Time", "Playback Time", "Display Size", "Water Resistance", "Connectivity", "Driver Size", "Weight", "Dimensions").
- Values should be concise, preserving numbers, units, and features.
- Ignore marketing fluff, emojis, delivery policies, or unrelated guarantees.
- Return ONLY valid JSON array with format: [{"label": "...", "value": "..."}, ...]`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Extract specifications from this text:\n\n${rawText.slice(0, 4000)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 1200,
        },
      });

      const text = response.text?.trim() || '[]';
      let json = JSON.parse(text);

      if (!Array.isArray(json) && typeof json === 'object') {
        if (Array.isArray(json.specs)) json = json.specs;
        else if (Array.isArray(json.specifications)) json = json.specifications;
      }

      const validSpecs: SpecItem[] = Array.isArray(json)
        ? json
            .filter((item) => item && typeof item === 'object' && item.label && item.value)
            .map((item) => ({
              label: String(item.label).trim(),
              value: String(item.value).trim(),
            }))
        : [];

      if (validSpecs.length > 0) {
        return NextResponse.json({ specs: validSpecs, source: 'gemini' });
      }
    } catch (aiErr) {
      console.warn('Gemini extraction error, using fallback:', aiErr);
    }

    // Fallback if AI returned nothing or errored
    const fallbackSpecs = fallbackParseSpecs(rawText);
    return NextResponse.json({ specs: fallbackSpecs, source: 'fallback_parser' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to extract specifications' },
      { status: 500 }
    );
  }
}
