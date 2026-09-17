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

    // 2. Intelligent Intent Detection & Natural Variations (Urdu, Roman Urdu, English)
    const lower = userMessage.toLowerCase();

    // Out-of-Scope check (Strict Store-Only Restriction)
    const isPureGibberishOrCoding =
      lower.includes('write code') ||
      lower.includes('python') ||
      lower.includes('javascript') ||
      lower.includes('html') ||
      lower.includes('recipe') ||
      lower.includes('essay') ||
      lower.includes('translate to french') ||
      lower.includes('who won') ||
      lower.includes('math problem') ||
      lower.includes('solve this equation');

    if (isPureGibberishOrCoding) {
      return NextResponse.json({
        reply: `Main sirf **${businessName}** ke products, live rates, delivery aur orders ke baray mein madad ke liye train kiya gaya hoon. Aap mobile accessories (earbuds, power banks, speakers, chargers) ya order karne ke mutabiq kuch bhi pooch sakte hain! ⚡`,
        products: [],
      });
    }

    // Language detection (Urdu / Roman Urdu)
    const isUrduQuery =
      lower.includes('bhai') ||
      lower.includes('dekho') ||
      lower.includes('dikhao') ||
      lower.includes('batao') ||
      lower.includes('wala') ||
      lower.includes('walay') ||
      lower.includes('wali') ||
      lower.includes('sasta') ||
      lower.includes('sastay') ||
      lower.includes('sasti') ||
      lower.includes('chahye') ||
      lower.includes('chahiye') ||
      lower.includes('chaiye') ||
      lower.includes('kya') ||
      lower.includes('hai') ||
      lower.includes('hein') ||
      lower.includes('hain') ||
      lower.includes('mujhe') ||
      lower.includes('kon sa') ||
      lower.includes('konsa') ||
      lower.includes('kese') ||
      lower.includes('kaise') ||
      lower.includes('kitne') ||
      lower.includes('kahan') ||
      lower.includes('pohancha') ||
      lower.includes('achi') ||
      lower.includes('acha') ||
      lower.includes('kuch');

    // Price Intent (Cheap / Sasta vs Expensive / Premium)
    const isCheapQuery =
      lower.includes('cheap') ||
      lower.includes('cheapest') ||
      lower.includes('sasta') ||
      lower.includes('sastay') ||
      lower.includes('sasti') ||
      lower.includes('budget') ||
      lower.includes('low price') ||
      lower.includes('lowest price') ||
      lower.includes('affordable') ||
      lower.includes('kam rate') ||
      lower.includes('kam price') ||
      lower.includes('kam qeemat') ||
      lower.includes('sab se kam') ||
      lower.includes('sab say kam') ||
      lower.includes('saste');

    const isExpensiveQuery =
      lower.includes('expensive') ||
      lower.includes('premium') ||
      lower.includes('mehnga') ||
      lower.includes('mehenga') ||
      lower.includes('high end') ||
      lower.includes('flagship') ||
      lower.includes('sab se acha') ||
      lower.includes('top model');

    // Category Intents
    const isEarbuds =
      lower.includes('earbud') ||
      lower.includes('buds') ||
      lower.includes('headphone') ||
      lower.includes('airpod') ||
      lower.includes('air pod') ||
      lower.includes('earphone') ||
      lower.includes('handsfree') ||
      lower.includes('p9');

    const isSpeakers =
      lower.includes('speaker') ||
      lower.includes('speakers') ||
      lower.includes('sound') ||
      lower.includes('audio') ||
      lower.includes('bluetooth speaker') ||
      lower.includes('rgb speaker') ||
      lower.includes('kts');

    const isPowerBank =
      lower.includes('power bank') ||
      lower.includes('powerbank') ||
      lower.includes('power-bank') ||
      lower.includes('battery') ||
      lower.includes('10000mah') ||
      lower.includes('10,000mah') ||
      lower.includes('20000mah') ||
      lower.includes('20,000mah');

    const isCharger =
      lower.includes('charger') ||
      lower.includes('chargers') ||
      lower.includes('adapter') ||
      lower.includes('fast charger') ||
      lower.includes('fast charging');

    const isCable =
      lower.includes('cable') ||
      lower.includes('cables') ||
      lower.includes('wire') ||
      lower.includes('type-c') ||
      lower.includes('type c') ||
      lower.includes('lightning') ||
      lower.includes('iphone cable');

    const isWatch =
      lower.includes('watch') ||
      lower.includes('smartwatch') ||
      lower.includes('smart watch');

    const isCover =
      lower.includes('cover') ||
      lower.includes('covers') ||
      lower.includes('case') ||
      lower.includes('cases');

    // Specific product inquiries not currently stocked
    const isP9Query = lower.includes('p9');
    const is20kPowerBankQuery = lower.includes('20000') || lower.includes('20,000');

    // Store Policies & FAQ Intents
    const isDealsQuery =
      lower.includes('deal') ||
      lower.includes('discount') ||
      lower.includes('sale') ||
      lower.includes('offer') ||
      lower.includes('bachat');

    const isNewArrivalsQuery =
      lower.includes('new') ||
      lower.includes('latest') ||
      lower.includes('arrival') ||
      lower.includes('naya') ||
      lower.includes('naye') ||
      lower.includes('nayi') ||
      lower.includes('aaj kya new');

    const isDeliveryQuery =
      lower.includes('delivery') ||
      lower.includes('shipping') ||
      lower.includes('charg') ||
      lower.includes('kitne din') ||
      lower.includes('time lagega') ||
      lower.includes('city') ||
      lower.includes('shehar');

    const isTrackingQuery =
      lower.includes('approve') ||
      lower.includes('tracking') ||
      lower.includes('track') ||
      lower.includes('kahan tak') ||
      lower.includes('status') ||
      lower.includes('pohancha') ||
      lower.includes('order number') ||
      lower.includes('order id');

    const isReturnPolicy =
      lower.includes('return') ||
      lower.includes('refund') ||
      lower.includes('warranty') ||
      lower.includes('guarantee') ||
      lower.includes('kharab') ||
      lower.includes('exchange');

    const isHowToOrder =
      lower.includes('how to order') ||
      lower.includes('order kaise') ||
      lower.includes('buy kaise') ||
      lower.includes('kese order') ||
      lower.includes('order book') ||
      lower.includes('whatsapp par order') ||
      lower.includes('whatsapp order');

    const isCatalogOverviewQuery =
      lower.includes('kya kya') ||
      lower.includes('all products') ||
      lower.includes('kya available hai') ||
      lower.includes('products available hain') ||
      lower.includes('list dikhao') ||
      lower.includes('sab products');

    const isRecommendationQuery =
      lower.includes('recommend') ||
      lower.includes('suggest') ||
      lower.includes('kuch acha') ||
      lower.includes('kya le sakta') ||
      lower.includes('gift') ||
      lower.includes('bundle');

    // 3. Smart Price Budget Matching (Supports "3000 tak", "2000 ke andar", "under 3000", etc.)
    let maxPrice: number | null = null;
    const urduPriceMatch = lower.match(/(?:rs\.?|pkr)?\s*(\d{3,6})\s*(?:tak|k andar|ke andar|mein|ka budget|k budget|tak ka|tak ki)/i);
    const engPriceMatch = lower.match(/(?:under|below|less than|upto|up to|max|within)\s*(?:rs\.?|pkr)?\s*(\d{3,6})/i);

    if (urduPriceMatch) {
      maxPrice = parseInt(urduPriceMatch[1], 10);
    } else if (engPriceMatch) {
      maxPrice = parseInt(engPriceMatch[1], 10);
    }

    let candidateProducts = allProducts;
    if (maxPrice && !isNaN(maxPrice)) {
      candidateProducts = candidateProducts.filter((p) => p.price <= maxPrice);
    }

    let relevantProducts: Product[] = [];

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
        return catName.includes('charger') || name.includes('charger') || name.includes('adapter');
      });
    } else if (isCable) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('cable') || name.includes('cable') || name.includes('wire');
      });
    } else if (isWatch) {
      relevantProducts = candidateProducts.filter((p) => {
        const catName = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return catName.includes('watch') || name.includes('watch');
      });
    } else if (isDealsQuery) {
      relevantProducts = candidateProducts.filter((p) => p.discount > 0 || (p.old_price && p.old_price > p.price));
    } else if (isNewArrivalsQuery) {
      relevantProducts = candidateProducts.filter((p) => p.new_arrival);
    } else if (isRecommendationQuery || isCatalogOverviewQuery) {
      relevantProducts = candidateProducts.slice(0, 4);
    } else {
      // General keyword search
      const stopWords = new Set([
        'the', 'and', 'for', 'with', 'show', 'need', 'want', 'what', 'which', 'have',
        'are', 'you', 'under', 'below', 'less', 'than', 'upto', 'from', 'some', 'give',
        'tell', 'about', 'find', 'looking', 'good', 'best', 'pkr', 'rs', 'rupees', 'product',
        'products', 'available', 'items', 'item', 'dekho', 'dikhao', 'wala', 'walay', 'wali',
        'chahye', 'chahiye', 'chaiye', 'sasta', 'sastay', 'sasti', 'cheap', 'bhai', 'mujhe',
        'kuch', 'acha', 'achi', 'kitne', 'kaise', 'kese'
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

    // Price Sorting & Strict "Sirf Cheap Wala" Filtering
    const isSingularCheap =
      lower.includes('wala') ||
      lower.includes('wali') ||
      lower.includes('cheapest') ||
      lower.includes('sab se sasta') ||
      lower.includes('sab say sasta') ||
      lower.includes('lowest') ||
      lower.includes('sab se kam');

    if (isCheapQuery && relevantProducts.length > 0) {
      relevantProducts.sort((a, b) => a.price - b.price);
      const minPrice = relevantProducts[0].price;
      if (isSingularCheap) {
        // User asked for "cheap wala" / "sasta wala" / "cheapest" -> ONLY show the single cheapest product
        relevantProducts = relevantProducts.filter((p) => p.price <= minPrice * 1.05).slice(0, 1);
      } else {
        // Plural / general budget request -> show ONLY products in the lowest budget tier
        const budgetThreshold = Math.max(minPrice * 1.25, minPrice + 400);
        const budgetItems = relevantProducts.filter((p) => p.price <= budgetThreshold);
        relevantProducts = budgetItems.length > 0 ? budgetItems.slice(0, 3) : relevantProducts.slice(0, 1);
      }
    } else if (isExpensiveQuery && relevantProducts.length > 0) {
      relevantProducts.sort((a, b) => b.price - a.price);
      const maxPriceVal = relevantProducts[0].price;
      relevantProducts = relevantProducts.filter((p) => p.price >= maxPriceVal * 0.85).slice(0, 2);
    }

    // General FAQ or Policy queries shouldn't display random products if not asking for one
    const isPurePolicyQuery = isDeliveryQuery || isTrackingQuery || isReturnPolicy || (isHowToOrder && !isEarbuds && !isSpeakers && !isPowerBank);
    if (isPurePolicyQuery) {
      relevantProducts = [];
    } else if (relevantProducts.length === 0 && (isRecommendationQuery || maxPrice)) {
      // If budget asked without category, give candidate products within budget
      relevantProducts = candidateProducts.slice(0, 3);
    }

    // Build Catalog Inventory for Gemini prompt
    const fullCatalogListStr = allProducts.map((p) => {
      return `- ${p.name} | Category: ${p.category?.name || 'Accessories'} | Price: Rs. ${p.price.toLocaleString()} ${p.old_price ? `(Old: Rs. ${p.old_price.toLocaleString()})` : ''} | Stock: ${p.stock_status === 'in_stock' ? 'In Stock' : 'Limited Stock'} | URL: /products/${p.slug}`;
    }).join('\n');

    // Build product context for matched selection
    const matchingProductsStr = relevantProducts.map((p) => {
      const specs = (p.specifications || []).map((s) => `${s.label}: ${s.value}`).join(', ');
      return `- Name: ${p.name} | Price: Rs. ${p.price.toLocaleString()} ${p.old_price ? `(Old: Rs. ${p.old_price.toLocaleString()})` : ''} | Stock: ${p.stock_status === 'in_stock' ? 'In Stock' : 'Limited'} | Specs: ${specs || 'Standard'} | URL: /products/${p.slug}`;
    }).join('\n');

    // 4. Try Google Gemini API
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `You are the official AI Shopping Assistant for STH Gadgets (https://www.sthgadgets.store), Pakistan's trusted online store for 100% original mobile accessories, audio, and tech gadgets.

CORE BEHAVIOR & RULES:
1. STORE-ONLY RESTRICTION: You ONLY discuss STH Gadgets products, prices, stock, delivery, and store support. For any coding, math, essay, or non-store topic, politely decline in 1 sentence.
2. NO HALLUCINATION: NEVER invent imaginary products, fake specs, or fake prices. Base all recommendations strictly on the real database catalog below.
3. HANDLING UNSTOCKED / POPULAR INQUIRIES:
   • P9 Headphones: State politely that P9 headphones are currently out of stock / not available, and recommend our in-stock **Buds Pro 6 (Rs. 1,699)** instead!
   • 20,000mAh Power Banks: State politely that 20,000mAh is currently out of stock, and recommend our **10,000mAh Power Banks (LMA LP-01 at Rs. 2,650 and Magnetic Wireless at Rs. 3,500)** with fast 22.5W charging!
   • Smart Watches & Mobile Covers: State that smart watches and phone covers are currently coming soon / not listed, and offer our available audio and power gadgets.
   • Chargers & Cables: If specific brand wall adapters or lightning cables are not directly in stock, guide them to our available fast charging power banks with built-in cables (LMA LP-01)!
4. BUDGET & "CHEAP WALA" RULES:
   • When customer asks for "cheap wala", "sasta wala", "cheapest", or "kam price wala", focus ONLY on the lowest-priced option. NEVER suggest higher-priced models!
   • When given a price limit (e.g. "3000 tak", "under 2000", "5000 ke andar"), recommend ONLY products that cost less than or equal to that amount.
5. STORE POLICIES & ORDERING:
   • Standard Delivery Fee: **Rs. 200** across entire Pakistan.
   • **FREE Delivery** on orders of **Rs. 5,000** or more!
   • Delivery Duration: **2 to 4 business days** nationwide.
   • Nationwide Coverage: Delivery is available to ALL cities, towns, and villages in Pakistan (Lahore, Karachi, Islamabad, Rawalpindi, Peshawar, Quetta, Multan, Faisalabad, etc.) with **Cash on Delivery (COD)**!
   • How to Order:
     1. Add to cart on website and click checkout.
     2. OR 1-tap WhatsApp Order directly by messaging +${whatsappNumber}.
   • Order Tracking & Approval:
     If a customer asks "Mera order approve hua hai?" or "Order kahan tak pohancha?", politely advise them to message on official WhatsApp (**+${whatsappNumber}**) with their **Order ID** or phone number, where support will instantly track and confirm their package!
   • Warranty & Return Policy:
     **7-Day Return / Replacement Guarantee** for manufacturing defects. 100% original and tested products. Contact support on WhatsApp for quick resolution.
6. TONE & FORMATTING:
   • Speak in natural, respectful, friendly Roman Urdu if the user asks in Urdu / Roman Urdu (e.g. "AoA bhai!", "Aap ke liye sab se behtareen option yeh hai...").
   • Speak in clean English if the user asks in English.
   • Use bold text for product names and prices (e.g., **Rs. 2,650**).
   • Use bullet points for features with emojis (⚡, 🔋, 🎧, 🚚, 📦).
   • Keep responses concise, helpful, and never write long repetitive essays.

FULL STORE INVENTORY FROM DATABASE:
${fullCatalogListStr}

FILTERED / MATCHING PRODUCTS FOR THIS QUERY:
${matchingProductsStr || 'No specific product match found for the strict category filter.'}
`;

        let conversationPrompt = '';
        if (history.length > 0) {
          conversationPrompt += 'Previous conversation:\n';
          history.forEach((h) => {
            conversationPrompt += `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}\n`;
          });
          conversationPrompt += '\n';
        }
        conversationPrompt += `Customer: ${userMessage}\nAssistant:`;

        let response;
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: conversationPrompt,
            config: {
              systemInstruction,
              temperature: 0.3,
              maxOutputTokens: 800,
            },
          });
        } catch (mErr) {
          console.warn('gemini-3.6-flash fallback to gemini-3.5-flash-lite:', mErr);
          response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: conversationPrompt,
            config: {
              systemInstruction,
              temperature: 0.3,
              maxOutputTokens: 800,
            },
          });
        }

        const reply = response.text?.trim();

        if (reply) {
          return NextResponse.json({
            reply,
            products: relevantProducts.slice(0, 4),
          });
        }
      } catch (geminiErr) {
        console.error('Gemini API call failed, using intelligent fallback:', geminiErr);
      }
    }

    // 5. Intelligent Fallback Handler (Covers All Training Scenarios)
    let fallbackReply = '';

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('salam') || lower.includes('aoa') || lower.includes('hey')) {
      fallbackReply = isUrduQuery
        ? `Salam! 👋 **${businessName}** par khush aamdeed! Main aap ka official AI Shopping Assistant hoon. Main aap ko earbuds, power banks, speakers, live prices, aur deals check karne mein madad kar sakta hoon. Aap ko kya dekhna hai? ⚡`
        : `Hello! 👋 Welcome to **${businessName}**. I'm your AI Shopping Assistant. How can I assist you today? You can ask me about earbuds, power banks, speakers, current deals, or delivery policies! ⚡`;
      relevantProducts = [];
    } else if (isTrackingQuery) {
      fallbackReply = isUrduQuery
        ? `📦 **Order Status & Tracking**:\nApne order ki confirmation, approval ya live courier status janne ke liye baraye meharbani apna **Order ID** ya registered phone number hamare official WhatsApp par send karein:\n\n📲 **WhatsApp:** +${whatsappNumber}\n\nHamari support team aap ko foran live update provide karegi!`
        : `📦 **Order Status & Tracking**:\nTo check your order approval, delivery status, or courier tracking, please send your **Order ID** or phone number directly to our WhatsApp support at **+${whatsappNumber}**. Our team will assist you immediately!`;
      relevantProducts = [];
    } else if (isDeliveryQuery) {
      fallbackReply = isUrduQuery
        ? `🚚 **STH Gadgets Delivery Information**:\n• **Delivery Charges:** Poore Pakistan mein sirf **Rs. 200**.\n• **FREE Delivery:** **Rs. 5,000** ya usse zyada ke orders par delivery bilkul FREE hai!\n• **Delivery Time:** 2 se 4 working days ke andar delivery ho jati hai.\n• **Cash on Delivery (COD):** Poore Pakistan ke har shehar aur gaon mein available hai!\n\nOrder karne ke liye WhatsApp par rabta karein: +${whatsappNumber}`
        : `🚚 **STH Gadgets Delivery Information**:\n• **Delivery Fee:** Standard **Rs. 200** nationwide across Pakistan.\n• **FREE Shipping:** On all orders above **Rs. 5,000**!\n• **Delivery Time:** Delivered within 2-4 business days.\n• **Cash on Delivery (COD):** Available in all cities and areas across Pakistan!`;
      relevantProducts = [];
    } else if (isReturnPolicy) {
      fallbackReply = isUrduQuery
        ? `🛡️ **Warranty & Return Policy**:\n• STH Gadgets ke saare items 100% original aur quality tested hotay hain.\n• Hum **7-day return / replacement guarantee** dete hain manufacturing defect ki soorat mein.\n• Kisi bhi complaint ya help ke liye hamare official WhatsApp par message karein: **+${whatsappNumber}**.`
        : `🛡️ **Warranty & Return Policy**:\n• All products are 100% original and tested.\n• We offer a **7-day return/replacement policy** for any manufacturing defects.\n• Contact our support team on WhatsApp at **+${whatsappNumber}** for quick assistance.`;
      relevantProducts = [];
    } else if (isHowToOrder) {
      fallbackReply = isUrduQuery
        ? `🛒 **Order Kaise Karein?**\n\n1. Website par apni pasandeeda product select karein aur Cart mein add karein.\n2. Checkout button press kar ke apna naam aur address likhein.\n3. **1-Tap WhatsApp Order:** Aap seedha humare WhatsApp (+${whatsappNumber}) par product ka naam ya screenshot bhej kar bhi foran order confirm karwa sakte hain!\n\nDelivery charges sirf Rs. 200 hain aur Rs. 5,000 se upar FREE delivery hai! 🚚`
        : `🛒 **How to Place an Order**:\n\n1. Add your favorite gadgets to the cart on our website.\n2. Proceed to Checkout and enter your delivery details.\n3. **Direct WhatsApp Order:** Simply tap 'Order on WhatsApp' or message us at +${whatsappNumber} with your desired item for instant booking!\n\nCash on Delivery available nationwide! 🚚`;
      relevantProducts = [];
    } else if (isP9Query) {
      fallbackReply = isUrduQuery
        ? `Filhal humare paas **P9 Headphones** stock mein available nahi hain. Lekin aap humari top-rated **Buds Pro 6** check kar sakte hain sirf **Rs. 1,699** mein jo touch control aur behtareen sound provide karti hain! 🎧`
        : `Currently, P9 headphones are out of stock. We highly recommend checking out our popular **Buds Pro 6** at **Rs. 1,699** with touch controls and crystal-clear audio! 🎧`;
      relevantProducts = candidateProducts.filter((p) => p.category?.name?.toLowerCase().includes('earbud') || p.name.toLowerCase().includes('bud'));
    } else if (is20kPowerBankQuery) {
      fallbackReply = isUrduQuery
        ? `Humare paas filhal 20,000mAh model stock mein nahi hai, lekin 10,000mAh fast charging power banks available hain jese **LMA LP-01 (Rs. 2,650)** aur **Magnetic Wireless Power Bank (Rs. 3,500)**! 🔋`
        : `Currently, 20,000mAh models are out of stock. We have high-performance 10,000mAh fast charging power banks available starting at **Rs. 2,650**! 🔋`;
      relevantProducts = candidateProducts.filter((p) => p.name.toLowerCase().includes('power bank'));
    } else if (isWatch || isCover) {
      fallbackReply = isUrduQuery
        ? `Smart watches aur Mobile covers filhal humare paas listed nahi hain (coming soon). Lekin aap humare top-selling Wireless Earbuds, Power Banks aur Bluetooth Speakers check kar sakte hain! ⚡`
        : `Smart watches and phone covers are currently not listed in our catalog. Please check out our best-selling Wireless Earbuds, Fast Charging Power Banks, and Bluetooth Speakers! ⚡`;
      relevantProducts = candidateProducts.slice(0, 3);
    } else if (isCatalogOverviewQuery) {
      fallbackReply = isUrduQuery
        ? `Humare paas yeh 100% original gadgets available hain:\n• 🎧 **Wireless Earbuds** (Buds Pro 6)\n• 🔋 **Fast Charging Power Banks** (10,000mAh Digital Display & Magnetic Wireless)\n• 🔊 **Bluetooth Speakers** (OTeam M3 Mini, KTS-1892 RGB, KTS-2119 Waterproof)\n\nAap ko kis category mein interested hain? ⚡`
        : `Here are the top product categories available at ${businessName}:\n• 🎧 **Wireless Earbuds** (Buds Pro 6)\n• 🔋 **Fast Power Banks** (10,000mAh with digital display & built-in cables)\n• 🔊 **Bluetooth Speakers** (OTeam Mini, KTS-1892 RGB, KTS-2119)\n\nLet me know which category you would like to explore! ⚡`;
    } else if (relevantProducts.length > 0) {
      if (isCheapQuery) {
        fallbackReply = isUrduQuery
          ? `Aap ke liye ${businessName} par sab se sasta aur best value option yeh raha sirf **Rs. ${relevantProducts[0].price.toLocaleString()}** mein:`
          : `Here is the most affordable and budget-friendly option at ${businessName} for **Rs. ${relevantProducts[0].price.toLocaleString()}**:`;
      } else {
        fallbackReply = isUrduQuery
          ? `Aap ki request ke mutabiq yeh products available hain:`
          : `Here are the top products available matching your request:`;
      }
    } else {
      fallbackReply = isUrduQuery
        ? `Main ${businessName} ke products, live prices aur delivery ke baray mein madad ke liye hazir hoon. Aap earbuds, power banks ya speakers ke mutabiq kuch bhi pooch sakte hain! ⚡`
        : `I'm here to assist with ${businessName} products, orders, delivery, and store policies. What gadget or accessory can I help you find today? ⚡`;
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
      { status: 200 }
    );
  }
}
