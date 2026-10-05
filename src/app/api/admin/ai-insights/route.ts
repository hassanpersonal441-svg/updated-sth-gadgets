import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireAdmin } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Require admin authentication
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { products, orders, categories, metrics } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service unavailable — GEMINI_API_KEY not configured' }, { status: 503 });
    }

    // ── Build a rich, accurate business context for Gemini ────────────────
    // NOTE: All numbers come from the deterministic server-side calculation.
    // Gemini MUST NOT invent or recalculate financial figures.
    const businessContext = `
STH Gadgets — Pakistani Mobile Accessories Store
Business Intelligence Report (server-computed, do not recalculate):

FINANCIAL METRICS (REAL DATA):
- Total Sales Revenue: PKR ${Number(metrics.totalRevenue || 0).toLocaleString('en-PK')}
- Total Product Cost: PKR ${Number(metrics.totalProductCost || 0).toLocaleString('en-PK')} (listed + vendor purchases, no double-counting)
- Gross Profit: PKR ${Number(metrics.grossProfit || 0).toLocaleString('en-PK')}
- Profit Margin: ${Number(metrics.profitMargin || 0)}%
- Today's Profit: PKR ${Number(metrics.todayProfit || 0).toLocaleString('en-PK')}
- This Month's Profit: PKR ${Number(metrics.monthProfit || 0).toLocaleString('en-PK')}
- Pending Vendor Purchases: ${metrics.pendingVendorPurchases || 0} (purchases not yet fulfilled)
- Items Missing Purchase Cost: ${metrics.missingCostItems || 0}

ORDER METRICS:
- Total Orders (all time): ${metrics.totalOrders || 0}
- Approved/Counted Orders: ${metrics.approvedOrders || 0}
- Today's Orders: ${metrics.todayOrders || 0}

INVENTORY:
- Active Listed Products: ${metrics.activeProducts || 0}
- Low Stock Products: ${metrics.lowStockProducts || 0}
- Out of Stock Products: ${metrics.outOfStockProducts || 0}
- Categories: ${(categories || []).length}

TOP PRODUCTS (sample):
${(products || []).slice(0, 12).map((p: any) => `- ${p.name}: PKR ${Number(p.price || 0).toLocaleString('en-PK')} (${p.stock_status})`).join('\n')}

RECENT ORDERS (last 10):
${(orders || []).slice(0, 10).map((o: any) => `- ${o.customer_name || 'Customer'}: PKR ${Number(o.total_amount || 0).toLocaleString('en-PK')} (${o.status})`).join('\n')}

CATEGORIES:
${(categories || []).map((c: any) => `- ${c.name}`).join('\n')}
`.trim();

    const prompt = `You are a business intelligence AI analyst for STH Gadgets, a Pakistani mobile accessories store.

IMPORTANT RULES:
1. Do NOT invent, estimate, or recalculate any financial numbers. Use ONLY the numbers provided in the data below.
2. When you mention financial figures, quote them exactly from the data.
3. Be concise and practical — focus on what the admin can actually act on.
4. Write in a professional but friendly tone.

Your task: Analyze the business data below and return a JSON response with:
- "overview": 2-3 sentence business health summary mentioning the real revenue, profit, and margin figures
- "financialSummary": 1-2 sentences explaining what the profit and cost numbers mean in plain language
- "trends": array of 3-5 specific observations about sales, inventory, or vendor patterns from the data
- "recommendations": array of 3-5 concrete, actionable steps the admin should take this week

Business Data:
${businessContext}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "overview": "...",
  "financialSummary": "...",
  "trends": ["...", "...", "..."],
  "recommendations": ["...", "...", "..."]
}`;

    const ai = new GoogleGenAI({ apiKey });

    // Try primary model, fallback to lighter model if unavailable
    let responseText: string | undefined;
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { temperature: 0.2, maxOutputTokens: 1200 },
        });
        responseText = response.text?.trim();
        if (responseText) break;
      } catch {
        // Try next model
        continue;
      }
    }

    if (!responseText) {
      return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 503 });
    }

    // Extract JSON from response (handle cases where model wraps in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned an unexpected format' }, { status: 500 });
    }

    let aiInsights: any;
    try {
      aiInsights = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    // Validate required fields exist
    if (!aiInsights.overview || !Array.isArray(aiInsights.trends) || !Array.isArray(aiInsights.recommendations)) {
      return NextResponse.json({ error: 'AI response missing required fields' }, { status: 500 });
    }

    return NextResponse.json({ success: true, insights: aiInsights });

  } catch (error: any) {
    console.error('AI insights error:', error);
    return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 503 });
  }
}
