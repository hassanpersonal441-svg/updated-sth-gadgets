import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Product, Settings } from '@/types/database';
import { GoogleGenAI } from '@google/genai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const rawMessage = body.message?.trim();

    if (!rawMessage) {
      return NextResponse.json(
        { reply: 'Please enter a message.', products: [] },
        { status: 400 }
      );
    }

    // Limit input length for security & performance
    const userMessage = rawMessage.slice(0, 500);
    const history = (body.history || []).slice(-8); // Keep last 8 turns of context

    // 1. Fetch store settings and active products from database using service client
    const supabase = createServiceClient();
    const [settingsRes, productsRes] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase
        .from('products')
        .select('id, name, slug, description, short_description, specifications, price, old_price, discount, stock_status, featured, best_seller, new_arrival, active, category:categories(*), product_images(*)')
        .eq('active', true)
        .order('created_at', { ascending: false }),
    ]);

    const settings = settingsRes.data as Settings | null;
    if (productsRes.error) {
      console.error('[DEBUG] Chat productsRes error:', productsRes.error);
    }
    console.log('[DEBUG] Chat productsRes data length:', productsRes.data?.length);
    const allProducts = (productsRes.data as unknown as Product[]) || [];

    const whatsappNumber = (settings?.whatsapp_number || '923489593671').replace(/[^0-9]/g, '');
    const businessName = settings?.business_name || 'STH Gadgets';

    // 2. Intelligent Product Filtering
    const lower = userMessage.toLowerCase();
    const isDealsQuery = lower.includes('deal') || lower.includes('discount') || lower.includes('sale') || lower.includes('offer');
    const isNewArrivalsQuery = lower.includes('new') || lower.includes('latest') || lower.includes('arrival');
    const isBestSellerQuery = lower.includes('best') || lower.includes('popular') || lower.includes('top');
    
    // Price match like "under 3000", "under 5000", "below 2000"
    const priceMatch = lower.match(/(?:under|below|less than|upto|up to|max|within)\s*(?:rs\.?|pkr)?\s*(\d+)/i);
    const maxPrice = priceMatch ? parseInt(priceMatch[1], 10) : null;

    let relevantProducts: Product[] = [];

    // Filter by price if requested
    let candidateProducts = allProducts;
    if (maxPrice && !isNaN(maxPrice)) {
      candidateProducts = candidateProducts.filter((p) => p.price <= maxPrice);
    }

    // Check specific gadget categories
    const isEarbuds = lower.includes('earbud') || lower.includes('buds') || lower.includes('headphone') || lower.includes('airpod');
    const isSpeakers = lower.includes('speaker') || lower.includes('sound') || lower.includes('audio');
    const isPowerBank = lower.includes('power bank') || lower.includes('powerbank') || lower.includes('battery');
    const isCharger = lower.includes('charger') || lower.includes('fast charger') || lower.includes('adapter');
    const isCable = lower.includes('cable') || lower.includes('wire') || lower.includes('type c') || lower.includes('iphone cable');
    const isWatch = lower.includes('watch') || lower.includes('smartwatch');

    if (isEarbuds) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('earbud') || name.includes('bud') || name.includes('earphone') || name.includes('airpod');
      });
    } else if (isSpeakers) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('speaker') || name.includes('speaker') || name.includes('sound');
      });
    } else if (isPowerBank) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('power bank') || name.includes('power bank') || name.includes('powerbank');
      });
    } else if (isCharger) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('charger') || name.includes('charger');
      });
    } else if (isCable) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('cable') || name.includes('cable');
      });
    } else if (isWatch) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('watch') || name.includes('watch');
      });
    } else if (isDealsQuery) {
      relevantProducts = candidateProducts.filter((p) => p.discount > 0 || (p.old_price && p.old_price > p.price));
    } else if (isBestSellerQuery) {
      relevantProducts = candidateProducts.filter((p) => p.best_seller);
    } else if (isNewArrivalsQuery) {
      relevantProducts = candidateProducts.filter((p) => p.new_arrival);
    } else {
      // General keyword search
      const stopWords = new Set([
        'the', 'and', 'for', 'with', 'show', 'need', 'want', 'what', 'which', 'have',
        'are', 'you', 'under', 'below', 'less', 'than', 'upto', 'from', 'some', 'give',
        'tell', 'about', 'find', 'looking', 'good', 'best', 'pkr', 'rs', 'rupees', 'product',
        'products', 'available', 'items', 'item'
      ]);
      const keywords = userMessage
        .replace(/[^\w\s]/gi, ' ')
        .split(/\s+/)
        .map((w) => w.toLowerCase())
        .filter((w) => w.length > 2 && isNaN(Number(w)) && !stopWords.has(w));

      if (keywords.length > 0) {
        relevantProducts = candidateProducts.filter((p) => {
          const text = `${p.name} ${p.description || ''} ${p.short_description || ''} ${p.category?.name || ''}`.toLowerCase();
          return keywords.some((k) => text.includes(k));
        });
      }
    }

    // 3. Out-of-Scope non-store query check
    const isPureGibberishOrCoding =
      lower.includes('write code') ||
      lower.includes('python') ||
      lower.includes('javascript') ||
      lower.includes('who won') ||
      lower.includes('recipe') ||
      lower.includes('essay') ||
      lower.includes('translate') ||
      lower.includes('math problem');

    if (isPureGibberishOrCoding) {
      return NextResponse.json({
        reply: "I'm here to help with STH Gadgets products, orders, delivery and store information. Feel free to ask about our fast chargers, power banks, earbuds, speakers, or how to place an order! ⚡",
        products: [],
      });
    }

    // Policy & General Info queries - don't force random product attachments
    const isPolicyOrFAQ =
      lower.includes('delivery') ||
      lower.includes('shipping') ||
      lower.includes('return') ||
      lower.includes('refund') ||
      lower.includes('warranty') ||
      lower.includes('how to order') ||
      lower.includes('payment') ||
      lower.includes('cod') ||
      lower.includes('contact');

    if (!isPolicyOrFAQ && relevantProducts.length === 0 && candidateProducts.length > 0) {
      relevantProducts = candidateProducts.slice(0, 4);
    }

    // 4. Try Google Gemini API
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        // Build product catalog context for Gemini
        const productContextStr = relevantProducts.map((p) => {
          const specs = (p.specifications || []).map((s) => `${s.label}: ${s.value}`).join(', ');
          return `- Name: ${p.name} | Price: Rs. ${p.price.toLocaleString()} ${p.old_price ? `(Old: Rs. ${p.old_price.toLocaleString()})` : ''} | Stock: ${p.stock_status === 'in_stock' ? 'In Stock' : 'Limited/Out'} | Specs: ${specs || 'Standard'} | URL: /products/${p.slug}`;
        }).join('\n');

        const systemInstruction = `You are the official AI Shopping Assistant for STH Gadgets (https://www.sthgadgets.store), Pakistan's trusted store for 100% original mobile accessories and tech gadgets.

CRITICAL RULES:
1. ONLY answer questions related to STH Gadgets products, orders, delivery, and store policies.
2. For ANY unrelated question, politely reply: "I'm here to help with STH Gadgets products, orders, delivery and store information."
3. NEVER invent or hallucinate products, prices, discounts, or stock. Use ONLY the real database products provided below.
4. If a requested product is not in the list, state politely that it's currently out of stock or not listed, and suggest the closest available alternative.
5. Standard delivery charges: Rs. 200 anywhere across Pakistan. FREE delivery on orders above Rs. 5,000.
6. Cash on Delivery (COD) and WhatsApp ordering are available.
7. 7-Day return / replacement guarantee on manufacturing defects.
8. Official WhatsApp Support: +${whatsappNumber}.
9. Keep responses friendly, professional, concise, with helpful bullet points and emojis. Don't write overly long essays.
10. When mentioning products, mention their real price in Pakistani Rupees (Rs.).

CURRENT AVAILABLE PRODUCTS FROM DATABASE:
${productContextStr || 'No specific products match the current filter.'}
`;

        // Format history into conversation turns
        let conversationPrompt = '';
        if (history.length > 0) {
          conversationPrompt += 'Previous conversation:\n';
          history.forEach((h) => {
            conversationPrompt += `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}\n`;
          });
          conversationPrompt += '\n';
        }
        conversationPrompt += `Customer: ${userMessage}\nAssistant:`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: conversationPrompt,
          config: {
            systemInstruction,
            temperature: 0.4,
            maxOutputTokens: 600,
          },
        });

        const reply = response.text?.trim();

        if (reply) {
          return NextResponse.json({
            reply,
            products: relevantProducts.slice(0, 4), // Attach top 4 matching product cards
          });
        }
      } catch (geminiErr) {
        console.error('Gemini API call failed, using intelligent fallback:', geminiErr);
      }
    }

    // 5. Resilient Intelligent Fallback (if Gemini key is missing or external API is slow)
    // Delivers a high-quality, friendly store response backed by live Supabase data
    let fallbackReply = '';

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('salam')) {
      fallbackReply = `Hello! 👋 Welcome to ${businessName}. I'm your AI Shopping Assistant. How can I help you today? You can ask me for product recommendations, check prices, or browse our top deals! ⚡`;
      relevantProducts = [];
    } else if (lower.includes('order') || lower.includes('buy') || lower.includes('how to')) {
      fallbackReply = `Ordering at ${businessName} is quick and easy! 🛒\n\n1. Add your favorite items to the cart.\n2. Click "Checkout" to place your order online, or tap "Order on WhatsApp" to chat directly with us on +${whatsappNumber}.\n3. Standard delivery is Rs. 200 nationwide, and FREE for orders over Rs. 5,000! 🚚`;
      relevantProducts = [];
    } else if (lower.includes('delivery') || lower.includes('ship') || lower.includes('charg')) {
      fallbackReply = `🚚 **Delivery Information**:\n• Nationwide delivery across Pakistan in 2-4 business days.\n• Standard shipping fee: **Rs. 200**.\n• **FREE Shipping** on all orders above **Rs. 5,000**!\n• Cash on Delivery (COD) is available.`;
      relevantProducts = [];
    } else if (lower.includes('return') || lower.includes('refund') || lower.includes('warranty')) {
      fallbackReply = `🛡️ **Warranty & Return Policy**:\n• All products are 100% original and thoroughly tested.\n• We offer a **7-day return/replacement policy** for any manufacturing defects.\n• Need assistance? Contact our team on WhatsApp anytime at +${whatsappNumber}.`;
      relevantProducts = [];
    } else if (lower.includes('located') || lower.includes('address') || lower.includes('location') || lower.includes('shop') || lower.includes('store')) {
      fallbackReply = `📍 **STH Gadgets Location & Contact**:\n• We deliver 100% original gadgets nationwide across Pakistan.\n• Official WhatsApp: +${whatsappNumber}\n• Customer Support available daily.`;
      relevantProducts = [];
    } else if (relevantProducts.length > 0) {
      fallbackReply = `Here are the top products available at ${businessName} matching your request:`;
    } else {
      fallbackReply = `I'm here to help with ${businessName} products, orders, delivery and store information. Please let me know what tech gadget or accessory you're looking for! ⚡`;
    }

    return NextResponse.json({
      reply: fallbackReply,
      products: relevantProducts.slice(0, 4),
    });
  } catch (error) {
    console.error('Chat API general error:', error);
    return NextResponse.json(
      {
        reply: "Sorry, I'm temporarily unable to respond. Please try again or order directly through WhatsApp.",
        products: [],
      },
      { status: 200 } // Return 200 with polite customer-facing message to prevent UI crash
    );
  }
}
