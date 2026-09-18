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

/* ─────────────────────────────────────────────────────────────
   INTENT DETECTION HELPERS
───────────────────────────────────────────────────────────── */

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function matchesAny(lower: string, patterns: string[]) {
  return patterns.some((p) => lower.includes(p));
}

/** Pure greeting — no product search needed */
function isGreeting(lower: string): boolean {
  const greetings = [
    'assalam o alaikum', 'assalamualaikum', 'aoa', 'wa alaikum',
    'salam bhai', 'hello bhai', 'hi bhai', 'hey bhai',
    'salam', 'hello', 'hi ', ' hi', 'hey ', ' hey', 'helo', 'hii',
    'good morning', 'good evening', 'good afternoon',
  ];
  // Only match short messages (< 40 chars) as pure greetings
  if (lower.length > 60) return false;
  return matchesAny(lower, greetings);
}

/** Thanks / bye — direct responses */
function isThanks(lower: string) {
  return matchesAny(lower, ['thanks', 'thank you', 'shukriya', 'shukria', 'jazakallah', 'bahut shukriya']);
}
function isGoodbye(lower: string) {
  return matchesAny(lower, ['allah hafiz', 'allahafiz', 'bye', 'goodbye', 'tc ', 'take care', 'alvida', 'khuda hafiz']);
}

/** Casual acknowledgement */
function isCasualAck(lower: string) {
  const msgs = ['acha', 'theek hai', 'theek ha', 'okay', 'ok', 'haan', 'han', 'nahi', 'nai', 'hmm', 'ahan', 'alright', 'got it', 'samajh gaya', 'samajh gya'];
  return msgs.some((m) => lower === m || lower === m + '.' || lower === m + '!');
}

/** Out-of-scope content */
function isOutOfScope(lower: string) {
  return matchesAny(lower, [
    'write code', 'python', 'javascript', 'html code', 'css code',
    'recipe', 'essay', 'translate to french', 'who won', 'math problem',
    'solve this equation', 'news today', 'weather', 'cricket score',
    'stock market', 'forex', 'covid', 'politics',
  ]);
}

/* ─────────────────────────────────────────────────────────────
   PRICE BUDGET EXTRACTION
───────────────────────────────────────────────────────────── */
function extractMaxPrice(lower: string): number | null {
  const urduMatch = lower.match(/(\d{3,6})\s*(?:tak|k andar|ke andar|mein|ka budget|k budget|tak ka|tak ki|rs tak|rupay tak)/i);
  const engMatch = lower.match(/(?:under|below|less than|upto|up to|max|within|rs\.?)\s*(\d{3,6})/i);
  const plainRs = lower.match(/rs\.?\s*(\d{3,6})/i);

  if (urduMatch) return parseInt(urduMatch[1], 10);
  if (engMatch) return parseInt(engMatch[1], 10);
  if (plainRs) return parseInt(plainRs[1], 10);
  return null;
}

/* ─────────────────────────────────────────────────────────────
   CATEGORY DETECTION
───────────────────────────────────────────────────────────── */
function detectCategory(lower: string) {
  const earbuds = matchesAny(lower, [
    'earbud', 'earbuds', 'buds', 'headphone', 'headphones', 'airpod',
    'air pod', 'earphone', 'handsfree', 'wireless buds', 'p9',
    'calling earbuds', 'gaming earbuds', 'music earbuds', 'bluetooth earbuds',
    'buds pro', 'long battery buds', 'battery wali earbuds',
  ]);
  const speakers = matchesAny(lower, [
    'speaker', 'speakers', 'bluetooth speaker', 'rgb speaker', 'kts', 'oteam',
    'portable speaker', 'mini speaker', 'waterproof speaker', 'sound box',
  ]);
  const powerBank = matchesAny(lower, [
    'power bank', 'powerbank', 'power-bank', '10000mah', '10,000mah',
    '20000mah', '20,000mah', 'battery bank', 'portable battery',
    'magnetic wireless power', 'lma', 'digital display power',
    'travel power bank', 'iphone power bank', 'fast charging power',
  ]);
  const charger = matchesAny(lower, [
    'charger', 'chargers', 'adapter', 'fast charger', 'fast charging',
    'type-c charger', 'usb charger', 'iphone charger', 'wall charger',
    '65w', '33w', '22.5w', 'quick charge',
  ]);
  const cable = matchesAny(lower, [
    'cable', 'cables', 'wire', 'type-c cable', 'type c cable',
    'lightning', 'iphone cable', 'usb-c cable', 'usbc cable',
    'charging cable', 'data cable', 'fast charging cable',
  ]);
  const watch = matchesAny(lower, ['watch', 'smartwatch', 'smart watch', 'ghadi']);
  const cover = matchesAny(lower, ['cover', 'covers', 'case', 'cases', 'back cover', 'phone case']);

  return { earbuds, speakers, powerBank, charger, cable, watch, cover };
}

/* ─────────────────────────────────────────────────────────────
   INTENT FLAGS
───────────────────────────────────────────────────────────── */
function detectIntents(lower: string) {
  const isCheap = matchesAny(lower, [
    'cheap', 'cheapest', 'sasta', 'sastay', 'sasti', 'budget',
    'low price', 'lowest price', 'affordable', 'kam rate', 'kam price',
    'kam qeemat', 'sab se kam', 'sab say kam', 'saste', 'thora sasta',
    'sab se sasta', 'sab say sasta', 'reasonable rate', 'reasonable',
    'reasonable price', 'kam paise', 'sasta option', 'budget mein',
  ]);

  const isSingularCheap = matchesAny(lower, [
    'cheapest', 'sab se sasta', 'sab say sasta', 'lowest', 'sab se kam',
    'sab say kam', 'sab se sasti', 'ek sasta', 'sasta wala',
  ]);

  const isPremium = matchesAny(lower, [
    'expensive', 'premium', 'mehnga', 'mehenga', 'high end',
    'flagship', 'sab se acha', 'top model', 'best quality',
  ]);

  const isDeals = matchesAny(lower, [
    'deal', 'deals', 'discount', 'discounted', 'sale', 'offer', 'offers',
    'bachat', 'special deal', 'aaj ke deals', 'best deals', 'koi deal',
    'sale mein', 'bundle offer', 'bundle',
  ]);

  const isNewArrivals = matchesAny(lower, [
    'new arrival', 'new arrivals', 'latest', 'arrival', 'naya',
    'naye', 'nayi', 'aaj kya new', 'new product', 'aaj kya aaya',
    'latest product', 'abhi kya aaya',
  ]);

  const isDelivery = matchesAny(lower, [
    'delivery', 'shipping', 'kitne din', 'time lagega', 'shehar',
    'city delivery', 'free delivery', 'free shipping', 'delivery time',
    'charges kya hain', 'delivery charge', 'cod available',
    'cash on delivery', 'delivery available', 'pohancha',
  ]);

  const isTracking = matchesAny(lower, [
    'approve', 'approved', 'tracking', 'track', 'kahan tak',
    'order status', 'status', 'order pohancha', 'order number',
    'order id', 'mera order', 'order kahan',
  ]);

  const isReturn = matchesAny(lower, [
    'return', 'refund', 'warranty', 'guarantee', 'kharab',
    'exchange', 'replace', 'replacement', 'faulty', 'damage',
    'damage product', 'band ho gaya',
  ]);

  const isHowToOrder = matchesAny(lower, [
    'how to order', 'order kaise', 'buy kaise', 'kese order', 'order book',
    'whatsapp par order', 'whatsapp order', 'order karna', 'kaise mangwao',
    'order karna hai', 'order karwana', 'kaise mangao',
  ]);

  const isCatalogOverview = matchesAny(lower, [
    'kya kya', 'all products', 'kya available hai', 'products available',
    'list dikhao', 'sab products', 'kya milta hai', 'kya hai aapke paas',
    'store mein kya hai', 'kis cheez ka store', 'kya kya products',
    'sab kuch dikhao', 'mobile accessories', 'gadgets chahiye',
  ]);

  const isRecommendation = matchesAny(lower, [
    'recommend', 'suggest', 'kuch acha', 'kya le sakta', 'gift',
    'konsa loon', 'konsa lu', 'kya lena chahiye', 'kya le loon',
    'mujhe recommend', 'best option', 'best wala', 'acha wala',
    'better hai', 'better option', 'konsa better', 'acha gadget',
    'koi acha', 'koi suggest', 'help chahiye select',
  ]);

  const isComparison = matchesAny(lower, [
    'vs', 'versus', 'compare', 'comparison', 'ya doosra', 'better hai',
    'dono mein', 'in dono', 'konsa better', 'difference kya hai',
    'konsa zyada', 'ye ya wo', 'price ke hisaab', 'features ke hisaab',
  ]);

  const isLanguageUrdu = matchesAny(lower, [
    'bhai', 'dekho', 'dikhao', 'batao', 'wala', 'walay', 'wali',
    'sasta', 'sasti', 'chahiye', 'chaiye', 'kya', 'hai', 'hein',
    'hain', 'mujhe', 'konsa', 'kese', 'kaise', 'kitne', 'kahan',
    'acha', 'achi', 'kuch', 'lena', 'mangwana', 'chahta', 'chahti',
    'sirf', 'abhi', 'foran', 'jaldi', 'zaroor', 'bilkul', 'yar',
  ]);

  return {
    isCheap, isSingularCheap, isPremium, isDeals, isNewArrivals,
    isDelivery, isTracking, isReturn, isHowToOrder, isCatalogOverview,
    isRecommendation, isComparison, isLanguageUrdu,
  };
}

/* ─────────────────────────────────────────────────────────────
   MAIN HANDLER
───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const rawMessage = body.message?.trim();

    if (!rawMessage) {
      return NextResponse.json({ reply: 'Please enter a message.', products: [] }, { status: 400 });
    }

    const userMessage = rawMessage.slice(0, 500);
    const history = (body.history || []).slice(-8);
    const lower = normalize(userMessage);

    /* ── 1. Pure Direct Responses (NO DB call) ─────────────────── */

    if (isGreeting(lower)) {
      const isUrdu = matchesAny(lower, ['salam', 'aoa', 'assalam', 'bhai']);
      return NextResponse.json({
        reply: isUrdu
          ? `Wa Alaikum Assalam! 👋 **STH Gadgets** mein khush aamdeed! Main aap ka official AI Shopping Assistant hoon.\n\nMain aap ki help kar sakta hoon:\n• 🎧 Earbuds, Headphones\n• 🔋 Power Banks\n• 🔊 Bluetooth Speakers\n• 🔌 Chargers & Cables\n• 🚚 Delivery & Orders\n\nAap ko kya chahiye? ⚡`
          : `Hello! 👋 Welcome to **STH Gadgets** — Pakistan's trusted tech accessories store!\n\nI can help you with:\n• 🎧 Wireless Earbuds\n• 🔋 Fast Charging Power Banks\n• 🔊 Bluetooth Speakers\n• 📦 Orders & Delivery\n\nWhat can I help you find today? ⚡`,
        products: [],
      });
    }

    if (isThanks(lower)) {
      return NextResponse.json({
        reply: matchesAny(lower, ['shukriya', 'shukria', 'jazakallah', 'bahut'])
          ? `Jazakallah! 😊 Aap ki koi aur help ho toh zaroor poochein. **STH Gadgets** hamesha aap ki khidmat mein hazir hai! ⚡`
          : `You're welcome! 😊 Feel free to ask if you need anything else. Happy shopping at **STH Gadgets**! ⚡`,
        products: [],
      });
    }

    if (isGoodbye(lower)) {
      return NextResponse.json({
        reply: matchesAny(lower, ['allah hafiz', 'allahafiz', 'khuda hafiz', 'alvida'])
          ? `Allah Hafiz! 👋 **STH Gadgets** par dobara khush aamdeed. Aap ka din mubarak ho! 🌟`
          : `Goodbye! 👋 Thank you for visiting **STH Gadgets**. Come back anytime! 🌟`,
        products: [],
      });
    }

    if (isCasualAck(lower)) {
      return NextResponse.json({
        reply: matchesAny(lower, ['haan', 'han'])
          ? `Bilkul! Aap kuch bhi poochein — main aap ki madad ke liye yahan hoon. ⚡`
          : matchesAny(lower, ['nahi', 'nai'])
          ? `Koi baat nahi! Aur kuch chahiye toh zaroor batayein. 😊`
          : `Theek hai! Kuch aur poochhna ho toh batayen — earbuds, power banks, speakers ya delivery info. ⚡`,
        products: [],
      });
    }

    if (isOutOfScope(lower)) {
      return NextResponse.json({
        reply: `Main sirf **STH Gadgets** ke products, prices, deals aur orders ke baray mein madad ke liye train kiya gaya hoon. Aap mobile accessories ke baray mein kuch bhi pooch sakte hain! ⚡`,
        products: [],
      });
    }

    /* ── 2. Fetch DB (only when needed) ────────────────────────── */

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
    const allProducts = (productsRes.data as unknown as Product[]) || [];
    const whatsappNumber = (settings?.whatsapp_number || '923489593671').replace(/[^0-9]/g, '');
    const businessName = settings?.business_name || 'STH Gadgets';

    /* ── 3. Intent & Category Detection ───────────────────────── */

    const intents = detectIntents(lower);
    const cats = detectCategory(lower);
    const maxPrice = extractMaxPrice(lower);
    const { isLanguageUrdu } = intents;

    let candidateProducts = allProducts;
    if (maxPrice && !isNaN(maxPrice)) {
      candidateProducts = candidateProducts.filter((p) => p.price <= maxPrice);
    }

    let relevantProducts: Product[] = [];

    // Category-based filtering
    if (cats.earbuds) {
      relevantProducts = candidateProducts.filter((p) => {
        const cat = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return cat.includes('earbud') || cat.includes('headphone') || name.includes('bud') || name.includes('earphone') || name.includes('headphone');
      });
    } else if (cats.speakers) {
      relevantProducts = candidateProducts.filter((p) => {
        const cat = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return cat.includes('speaker') || name.includes('speaker') || name.includes('sound') || name.includes('kts') || name.includes('oteam');
      });
    } else if (cats.powerBank) {
      relevantProducts = candidateProducts.filter((p) => {
        const cat = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return cat.includes('power') || name.includes('power bank') || name.includes('powerbank') || name.includes('lma');
      });
    } else if (cats.charger) {
      relevantProducts = candidateProducts.filter((p) => {
        const cat = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return cat.includes('charger') || name.includes('charger') || name.includes('adapter');
      });
    } else if (cats.cable) {
      relevantProducts = candidateProducts.filter((p) => {
        const cat = p.category?.name?.toLowerCase() || '';
        const name = p.name.toLowerCase();
        return cat.includes('cable') || name.includes('cable') || name.includes('wire');
      });
    } else if (intents.isDeals) {
      relevantProducts = candidateProducts.filter((p) => p.discount > 0 || (p.old_price && p.old_price > p.price));
    } else if (intents.isNewArrivals) {
      relevantProducts = candidateProducts.filter((p) => p.new_arrival);
    } else if (intents.isCatalogOverview || intents.isRecommendation) {
      relevantProducts = candidateProducts.slice(0, 4);
    } else {
      // Keyword fallback search
      const stopWords = new Set([
        'the', 'and', 'for', 'with', 'show', 'need', 'want', 'what', 'which', 'have',
        'are', 'you', 'under', 'below', 'less', 'than', 'upto', 'from', 'some', 'give',
        'tell', 'about', 'find', 'looking', 'good', 'best', 'pkr', 'rs', 'rupees', 'product',
        'products', 'available', 'items', 'item', 'dekho', 'dikhao', 'wala', 'walay', 'wali',
        'chahye', 'chahiye', 'sasta', 'sasti', 'cheap', 'bhai', 'mujhe', 'kuch', 'acha',
        'achi', 'kitne', 'kaise', 'kese', 'konsa', 'lena', 'chahta', 'yar', 'hai', 'hain',
        'mein', 'par', 'ko', 'se', 'ka', 'ki', 'ke', 'ek', 'sirf', 'koi', 'aur',
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

    // Price sorting
    if (intents.isCheap && relevantProducts.length > 0) {
      relevantProducts.sort((a, b) => a.price - b.price);
      const minP = relevantProducts[0].price;
      if (intents.isSingularCheap) {
        relevantProducts = relevantProducts.filter((p) => p.price <= minP * 1.05).slice(0, 1);
      } else {
        const threshold = Math.max(minP * 1.25, minP + 400);
        const budget = relevantProducts.filter((p) => p.price <= threshold);
        relevantProducts = budget.length > 0 ? budget.slice(0, 3) : relevantProducts.slice(0, 1);
      }
    } else if (intents.isPremium && relevantProducts.length > 0) {
      relevantProducts.sort((a, b) => b.price - a.price);
      const maxP = relevantProducts[0].price;
      relevantProducts = relevantProducts.filter((p) => p.price >= maxP * 0.85).slice(0, 2);
    }

    // Pure policy queries — no products
    const isPurePolicyQuery =
      intents.isDelivery || intents.isTracking || intents.isReturn ||
      (intents.isHowToOrder && !cats.earbuds && !cats.speakers && !cats.powerBank);
    if (isPurePolicyQuery) relevantProducts = [];

    // Budget-only (no category) — show available within budget
    if (relevantProducts.length === 0 && (intents.isRecommendation || maxPrice)) {
      relevantProducts = candidateProducts.slice(0, 3);
    }

    /* ── 4. Build Gemini Prompt ────────────────────────────────── */

    const fullCatalogListStr = allProducts.map((p) =>
      `- ${p.name} | Category: ${p.category?.name || 'Accessories'} | Price: Rs. ${p.price.toLocaleString()} ${p.old_price ? `(Was: Rs. ${p.old_price.toLocaleString()})` : ''} | Stock: ${p.stock_status === 'in_stock' ? 'In Stock' : 'Limited'} | URL: /products/${p.slug}`
    ).join('\n');

    const matchingProductsStr = relevantProducts.map((p) => {
      const specs = (p.specifications || []).map((s) => `${s.label}: ${s.value}`).join(', ');
      return `- ${p.name} | Price: Rs. ${p.price.toLocaleString()} ${p.old_price ? `(Was: Rs. ${p.old_price.toLocaleString()})` : ''} | Stock: ${p.stock_status === 'in_stock' ? 'In Stock' : 'Limited'} | Specs: ${specs || 'N/A'} | URL: /products/${p.slug}`;
    }).join('\n');

    /* ── 5. Gemini API Call ─────────────────────────────────────── */

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `You are the official AI Shopping Assistant for STH Gadgets (sthgadgets.store), Pakistan's trusted online store for 100% original mobile accessories and tech gadgets.

━━━━━━━━━━ LANGUAGE RULES ━━━━━━━━━━
• If the user writes in Urdu / Roman Urdu (e.g. contains "bhai", "dikhao", "chahiye", "salam", "aoa", "kya", "hai", etc.) → reply in natural, friendly Roman Urdu.
• If the user writes in English → reply in clean English.
• Mix detected language = use Roman Urdu.
• Use bold for product names and prices. Use bullet points and emojis (⚡🔋🎧🔊🚚📦).
• Keep responses helpful and concise — no long repetitive paragraphs.

━━━━━━━━━━ GREETING HANDLING ━━━━━━━━━━
• If user says "Salam", "AoA", "Hi", "Hello" or any greeting → respond with a warm welcome in the appropriate language. DO NOT search for products.
• Greeting response MUST mention what you can help with (earbuds, power banks, speakers, delivery, orders).

━━━━━━━━━━ DIRECT RESPONSE RULES ━━━━━━━━━━
• "Thanks" / "Shukriya" → short polite thanks reply.
• "Bye" / "Allah Hafiz" → short warm goodbye.
• "Acha" / "Okay" / "Theek hai" → acknowledge naturally using conversation context.
• Do NOT search database for these.

━━━━━━━━━━ CORE RULES ━━━━━━━━━━
1. STORE-ONLY: Only discuss STH Gadgets products, prices, delivery, orders. Politely decline any off-topic request.
2. NO HALLUCINATION: NEVER invent products, specs, or prices. Base everything on the real catalog below.
3. BUDGET RULES:
   • "Sasta wala" / "cheapest" / "sab se sasta" → show ONLY the single lowest-priced option.
   • "3000 tak" / "under 2000" → show ONLY products ≤ that price.
   • Never suggest higher-priced products when asked for cheap/budget.
4. COMPARISON: Compare only products actually in our catalog using their real specs. Never invent specs.
5. OUT OF STOCK HANDLING:
   • P9 Headphones → "Currently out of stock. Our top alternative is Buds Pro 6 at Rs. 1,699 with touch controls and excellent sound! 🎧"
   • 20,000mAh Power Banks → "Currently not in stock. We have 10,000mAh fast charging power banks (LMA LP-01 at Rs. 2,650, Magnetic Wireless at Rs. 3,500)! 🔋"
   • Smart Watches / Mobile Covers → "Coming soon! Meanwhile check our earbuds, power banks and speakers. ⚡"

━━━━━━━━━━ STORE POLICIES ━━━━━━━━━━
• Delivery Fee: Rs. 200 flat nationwide.
• FREE Delivery: Orders Rs. 5,000 or above.
• Delivery Time: 2-4 working days.
• Coverage: ALL cities, towns & villages in Pakistan — COD available everywhere.
• How to Order: (1) Add to cart → Checkout on website. (2) OR WhatsApp order to +${whatsappNumber}.
• Order Tracking: Customer should message WhatsApp +${whatsappNumber} with their Order ID.
• Warranty: 7-Day Return/Replacement for manufacturing defects. 100% original products.

━━━━━━━━━━ FULL STORE CATALOG ━━━━━━━━━━
${fullCatalogListStr || 'No products currently in database.'}

━━━━━━━━━━ MATCHED PRODUCTS FOR THIS QUERY ━━━━━━━━━━
${matchingProductsStr || 'No direct category match — use full catalog to make best recommendation.'}
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
            config: { systemInstruction, temperature: 0.25, maxOutputTokens: 800 },
          });
        } catch {
          response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: conversationPrompt,
            config: { systemInstruction, temperature: 0.25, maxOutputTokens: 800 },
          });
        }

        const reply = response.text?.trim();
        if (reply) {
          return NextResponse.json({ reply, products: relevantProducts.slice(0, 4) });
        }
      } catch (geminiErr) {
        console.error('Gemini API failed, using fallback:', geminiErr);
      }
    }

    /* ── 6. Intelligent Fallback (No Gemini) ──────────────────── */

    const u = isLanguageUrdu;
    let fallbackReply = '';

    if (intents.isTracking) {
      fallbackReply = u
        ? `📦 **Order Status & Tracking:**\nApne order ki confirmation ya courier tracking ke liye apna **Order ID** ya registered phone number hamare WhatsApp par send karein:\n\n📲 **WhatsApp:** +${whatsappNumber}\n\nHamari team aap ko foran update degi!`
        : `📦 **Order Tracking:**\nSend your **Order ID** or phone number to our WhatsApp support at **+${whatsappNumber}**. Our team will instantly provide your delivery update!`;
      relevantProducts = [];
    } else if (intents.isDelivery) {
      fallbackReply = u
        ? `🚚 **STH Gadgets Delivery Info:**\n• Delivery Charges: Poore Pakistan sirf **Rs. 200**\n• FREE Delivery: **Rs. 5,000** ya usse zyada par!\n• Delivery Time: **2 se 4 working days**\n• **Cash on Delivery** har shehar aur gaon mein available!\n\nOrder ke liye: +${whatsappNumber}`
        : `🚚 **Delivery Info:**\n• Fee: **Rs. 200** flat nationwide\n• FREE on orders **Rs. 5,000+**\n• Time: **2-4 working days**\n• COD available all over Pakistan!`;
      relevantProducts = [];
    } else if (intents.isReturn) {
      fallbackReply = u
        ? `🛡️ **Warranty & Return Policy:**\n• Saare items 100% original aur tested hain.\n• **7-Day Return / Replacement** manufacturing defect par.\n• Kisi bhi masle ke liye WhatsApp karein: **+${whatsappNumber}**`
        : `🛡️ **Warranty & Returns:**\n• All products are 100% original.\n• **7-Day return/replacement** for manufacturing defects.\n• Contact WhatsApp support: **+${whatsappNumber}**`;
      relevantProducts = [];
    } else if (intents.isHowToOrder) {
      fallbackReply = u
        ? `🛒 **Order Kaise Karein:**\n1. Website par product add karein aur checkout karein.\n2. Ya seedha WhatsApp par order karein: **+${whatsappNumber}**\n\nDelivery: Rs. 200 | FREE on Rs. 5,000+ | COD available! 🚚`
        : `🛒 **How to Order:**\n1. Add items to cart and checkout on our website.\n2. OR WhatsApp us directly at **+${whatsappNumber}**\n\nDelivery Rs. 200 | FREE on Rs. 5,000+ | COD nationwide! 🚚`;
      relevantProducts = [];
    } else if (cats.watch || cats.cover) {
      fallbackReply = u
        ? `Smart watches aur mobile covers abhi available nahi hain (coming soon!). Lekin humare top-selling products check karein: 🎧 Earbuds, 🔋 Power Banks, 🔊 Speakers!`
        : `Smart watches and phone covers are coming soon! Meanwhile, check our best-selling Wireless Earbuds, Power Banks, and Bluetooth Speakers! ⚡`;
      relevantProducts = candidateProducts.slice(0, 3);
    } else if (matchesAny(lower, ['20000', '20,000'])) {
      fallbackReply = u
        ? `20,000mAh power bank filhal stock mein nahi hai. Lekin 10,000mAh fast charging options available hain jese **LMA LP-01 (Rs. 2,650)** aur **Magnetic Wireless (Rs. 3,500)**! 🔋`
        : `20,000mAh is currently out of stock. We have great 10,000mAh fast charging power banks from **Rs. 2,650**! 🔋`;
      relevantProducts = candidateProducts.filter((p) => p.name.toLowerCase().includes('power bank'));
    } else if (matchesAny(lower, ['p9'])) {
      fallbackReply = u
        ? `P9 Headphones filhal stock mein nahi hain. Hamari best-seller **Buds Pro 6 (Rs. 1,699)** check karein — touch controls, amazing sound! 🎧`
        : `P9 headphones are currently out of stock. Check our popular **Buds Pro 6 at Rs. 1,699** — touch controls and crystal audio! 🎧`;
      relevantProducts = candidateProducts.filter((p) => p.category?.name?.toLowerCase().includes('earbud') || p.name.toLowerCase().includes('bud'));
    } else if (intents.isCatalogOverview) {
      fallbackReply = u
        ? `**STH Gadgets** par yeh 100% original products available hain:\n• 🎧 **Wireless Earbuds** — Buds Pro 6\n• 🔋 **Power Banks** — 10,000mAh fast charging\n• 🔊 **Bluetooth Speakers** — OTeam M3, KTS-1892 RGB, KTS-2119\n\nKis category mein interested hain? ⚡`
        : `**STH Gadgets** has these 100% original products:\n• 🎧 **Wireless Earbuds** — Buds Pro 6\n• 🔋 **Power Banks** — 10,000mAh fast charging\n• 🔊 **Bluetooth Speakers** — OTeam M3, KTS RGB & Waterproof\n\nWhich category interests you? ⚡`;
    } else if (relevantProducts.length > 0) {
      fallbackReply = u
        ? `Aap ki request ke mutabiq yeh products available hain:`
        : `Here are the available products matching your request:`;
    } else {
      fallbackReply = u
        ? `Main **${businessName}** ke products, prices, deals aur delivery ke baray mein madad kar sakta hoon. Earbuds, power banks, speakers ya kuch bhi poochein! ⚡`
        : `I'm here to help with **${businessName}** products, prices, deals, and delivery. Ask me about earbuds, power banks, speakers, or anything else! ⚡`;
    }

    return NextResponse.json({ reply: fallbackReply, products: relevantProducts.slice(0, 4) });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { reply: "Sorry, I'm temporarily unable to respond. Please try again or order directly via WhatsApp.", products: [] },
      { status: 200 }
    );
  }
}
