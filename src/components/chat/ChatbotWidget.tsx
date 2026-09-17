'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { Product } from '@/types/database';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '🔍 Find a Product', query: 'Help me find a product' },
  { label: '🎧 Wireless Earbuds', query: 'Show me wireless earbuds' },
  { label: '🔋 Power Banks', query: 'Show me power banks' },
  { label: '🔥 Today’s Deals', query: 'Show me today’s deals and discounts' },
  { label: '🆕 New Arrivals', query: 'What are the newest arrivals?' },
  { label: '📦 How to Order?', query: 'How does delivery and ordering work?' },
];

export default function ChatbotWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showNotificationBadge, setShowNotificationBadge] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addToCart, openCart, totalItems } = useCart();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Completely hide chatbot from the Admin Panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Prevent background scrolling on mobile when chat is open
  useEffect(() => {
    if (isOpen) {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Initial welcome message matching the user's reference design
  useEffect(() => {
    setMessages([
      {
        id: 'welcome-1',
        role: 'assistant',
        content:
          "Hi! 👋\nNeed help? I'm your STH Gadgets chat assistant. Ask me anything about our products, features, or get quick support. I'm here to help! ⚡",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened on non-touch screens (avoids unexpected keyboard popup on mobile)
  useEffect(() => {
    if (isOpen) {
      setShowNotificationBadge(false);
      if (window.innerWidth >= 640) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      }
    }
  }, [isOpen]);

  const handleSendMessage = async (queryText?: string) => {
    const text = (queryText || inputValue).trim();
    if (!text || isLoading) return;

    setHasInteracted(true);
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build lightweight conversation history
      const history = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || "I'm here to help with STH Gadgets products, orders, delivery and store information.",
        products: data.products || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I'm temporarily unable to respond. Please try again or order directly through WhatsApp.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    openCart();
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING LAUNCHER BUTTON (RESPONSIVE POSITIONING ABOVE MOBILE NAV)     */}
      {/* ========================================================================= */}
      {!isOpen && (
        <div
          className={`fixed z-40 flex items-center gap-3 transition-all duration-300 ${
            totalItems > 0
              ? 'bottom-36 right-4 sm:bottom-6 sm:right-6' // Elevate above floating cart if items present
              : 'bottom-20 right-4 sm:bottom-6 sm:right-6' // Sits above mobile bottom nav on phone, standard on desktop
          }`}
        >
          {/* Subtle invitation pill on desktop screens */}
          {!hasInteracted && (
            <button
              onClick={() => setIsOpen(true)}
              className={`hidden md:flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition hover:scale-105 ${
                isLight
                  ? 'border-[#00C4CC]/50 bg-white/95 text-slate-800 hover:border-[#00C4CC]'
                  : 'border-[#00C4CC]/50 bg-[#0C1420]/95 text-white hover:border-[#00C4CC]'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C4CC] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C4CC]"></span>
              </span>
              <span>Need help? Chat with AI Assistant</span>
            </button>
          )}

          {/* Floating Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open STH Gadgets AI Shopping Assistant"
            className="group relative flex h-13 w-13 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0B1526] via-[#050C17] to-[#01060F] p-1 shadow-[0_0_25px_rgba(0,196,204,0.6)] ring-3 sm:ring-4 ring-[#00C4CC]/70 transition duration-300 hover:scale-110 hover:ring-[#00C4CC] hover:shadow-[0_0_35px_rgba(0,196,204,0.9)] active:scale-95 touch-manipulation"
          >
            {/* Pulsing Glow Ring */}
            <span className="absolute -inset-1 -z-10 rounded-full bg-[#00C4CC] opacity-35 blur-md transition duration-500 group-hover:opacity-80"></span>

            {/* Robot Head Mascot inside floating button */}
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 overflow-hidden rounded-full border border-[#00C4CC]/80 bg-[#060D17] shadow-inner">
              <Image
                src="/images/robot-head.png"
                alt="STH AI Assistant"
                fill
                sizes="(max-width: 640px) 44px, 48px"
                className="object-cover transition duration-300 group-hover:scale-110"
              />
            </div>

            {/* Unread notification ping */}
            {showNotificationBadge && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C4CC] opacity-75"></span>
                <span className="relative inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 border-[#080D15] bg-[#00C4CC]"></span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CHAT MODAL (RESPONSIVE: DOCKED BOTTOM SHEET ON MOBILE, CARD ON DESKTOP) */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-end sm:justify-end sm:p-6 md:p-8">
          {/* Backdrop on mobile for focus and easy dismissal */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm sm:hidden transition-opacity"
            aria-hidden="true"
          />

          {/* Chat Window Card Container */}
          <div className="relative z-10 w-full sm:w-[420px] max-w-full pointer-events-auto">
            <div
              className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
                isLight
                  ? 'bg-white text-slate-900 border-t sm:border-2 border-[#00C4CC] shadow-[0_15px_45px_rgba(0,196,204,0.25)]'
                  : 'bg-[#0B1320] text-slate-200 border-t sm:border-2 border-[#00C4CC]/75 shadow-[0_0_40px_rgba(0,196,204,0.4)]'
              } w-full h-[92dvh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl backdrop-blur-xl animate-fade-in`}
            >
              {/* Top Electric Glow Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00C4CC] to-transparent opacity-80" />

              {/* Mobile drag handle indicator */}
              <div className="flex justify-center pt-2 pb-1 sm:hidden">
                <div className="h-1.5 w-12 rounded-full bg-slate-500/40" />
              </div>

              {/* ------------------------------------------------------------- */}
              {/* HEADER: Robot Avatar + STH Gadgets + Online Dot + Close Button */}
              {/* ------------------------------------------------------------- */}
              <div
                className={`flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-5 ${
                  isLight ? 'border-slate-200 bg-white/90' : 'border-slate-800/80 bg-black/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Clean Circular Robot Avatar */}
                  <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#00C4CC] bg-[#070E1A] shadow-[0_0_12px_rgba(0,196,204,0.5)]">
                    <Image
                      src="/images/robot-head.png"
                      alt="STH AI Assistant"
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-display text-sm sm:text-base font-extrabold tracking-wide uppercase truncate ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        STH Gadgets
                      </h3>
                      <span className="shrink-0 rounded bg-[#00C4CC]/20 px-1.5 py-0.2 text-[10px] font-black tracking-wider text-[#00C4CC] uppercase">
                        AI
                      </span>
                    </div>
                    {/* Pulsing Online Indicator */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-500 tracking-wide">
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close Button - large touch target for mobile */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  className={`rounded-xl p-2.5 transition active:scale-95 touch-manipulation ${
                    isLight
                      ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* MESSAGES BODY (Responsive & Touch Friendly)                  */}
              {/* ------------------------------------------------------------- */}
              <div
                className={`flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-4 space-y-3.5 text-xs sm:text-sm scrollbar-thin ${
                  isLight ? 'bg-slate-50/70 scrollbar-thumb-slate-300' : 'scrollbar-thumb-slate-700'
                } scrollbar-track-transparent`}
              >
                {/* Robot Welcome Hero Banner Inside Chat */}
                <div
                  className={`flex items-center gap-3 rounded-2xl border p-3 shadow-md ${
                    isLight
                      ? 'border-[#00C4CC]/40 bg-gradient-to-r from-sky-50 via-white to-sky-50 text-slate-800'
                      : 'border-[#00C4CC]/40 bg-gradient-to-r from-[#0C1524] via-[#0E1A2C] to-[#0A111E] text-slate-200'
                  }`}
                >
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-2xl border border-[#00C4CC]/60 bg-black/60 shadow-[0_0_12px_rgba(0,196,204,0.4)]">
                    <Image
                      src="/images/robot-clean.png"
                      alt="STH Robot Assistant"
                      fill
                      sizes="(max-width: 640px) 48px, 56px"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-bold text-[11px] sm:text-xs text-[#00C4CC] uppercase tracking-wider block truncate">
                      Official AI Shopping Assistant
                    </span>
                    <p className="text-[10.5px] sm:text-[11px] leading-relaxed mt-0.5 opacity-90">
                      Ask me about 100% original earbuds, power banks, chargers, live rates & fast WhatsApp delivery!
                    </p>
                  </div>
                </div>

                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-2 animate-fade-in">
                    {msg.role === 'assistant' ? (
                      /* Assistant Bubble with Robot Avatar Icon */
                      <div className="flex items-start gap-2 sm:gap-2.5">
                        <div className="relative h-7 w-7 sm:h-8 sm:w-8 shrink-0 overflow-hidden rounded-full border border-[#00C4CC]/70 bg-black/90 p-0.5 shadow-[0_0_8px_rgba(0,196,204,0.4)]">
                          <Image
                            src="/images/robot-head.png"
                            alt="STH Assistant"
                            fill
                            sizes="32px"
                            className="object-cover rounded-full"
                          />
                        </div>
                        <div className="max-w-[88%] sm:max-w-[85%] space-y-2">
                          <div
                            className={`rounded-2xl rounded-tl-none p-3 sm:p-3.5 shadow-md whitespace-pre-wrap leading-relaxed ${
                              isLight
                                ? 'bg-white border border-slate-200 text-slate-800'
                                : 'bg-[#162235] border border-slate-700/60 text-slate-100'
                            }`}
                          >
                            {msg.content}
                          </div>

                          {/* Interactive Product Cards inside Chat (Mobile Responsive Layout) */}
                          {msg.products && msg.products.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <p className="text-[10px] sm:text-[11px] font-bold text-[#00C4CC] uppercase tracking-wider">
                                Recommended Products:
                              </p>
                              <div className="grid gap-2">
                                {msg.products.map((product) => {
                                  const thumbnail =
                                    product.product_images && product.product_images.length > 0
                                      ? product.product_images[0].image_url
                                      : '/images/logo.png';
                                  const whatsappUrl = `https://wa.me/923489593671?text=${encodeURIComponent(
                                    `Hi STH Gadgets! I am interested in ${product.name} (Rs. ${product.price}). Is it available?`
                                  )}`;

                                  return (
                                    <div
                                      key={product.id}
                                      className={`flex items-center gap-2.5 sm:gap-3 rounded-xl p-2 sm:p-2.5 transition ${
                                        isLight
                                          ? 'bg-white border border-slate-200 shadow-sm hover:border-[#00C4CC]'
                                          : 'bg-[#0E1624] border border-slate-700/80 hover:border-[#00C4CC]/60'
                                      }`}
                                    >
                                      {/* Product Image */}
                                      <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                        <Image
                                          src={thumbnail}
                                          alt={product.name}
                                          fill
                                          sizes="(max-width: 640px) 48px, 56px"
                                          className="object-cover"
                                        />
                                      </div>

                                      {/* Details */}
                                      <div className="flex-1 min-w-0">
                                        <h4
                                          className={`font-semibold text-xs truncate ${
                                            isLight ? 'text-slate-900' : 'text-white'
                                          }`}
                                        >
                                          {product.name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="font-bold text-xs text-[#00C4CC]">
                                            Rs. {product.price.toLocaleString()}
                                          </span>
                                          {product.old_price && (
                                            <span className="text-[10px] text-slate-400 line-through">
                                              Rs. {product.old_price.toLocaleString()}
                                            </span>
                                          )}
                                        </div>

                                        {/* Action Buttons - touch friendly & wrap on mobile */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                          <Link
                                            href={`/products/${product.slug}`}
                                            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition active:scale-95 ${
                                              isLight
                                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                            }`}
                                          >
                                            View
                                          </Link>
                                          <button
                                            type="button"
                                            onClick={() => handleAddToCart(product)}
                                            className="rounded-lg bg-[#00C4CC] px-2 py-1 text-[10px] font-bold text-black transition hover:bg-[#00B2B9] active:scale-95"
                                          >
                                            + Cart
                                          </button>
                                          <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-lg bg-[#25D366] px-2 py-1 text-[10px] font-bold text-black transition hover:bg-[#1EBE5D] active:scale-95"
                                          >
                                            WhatsApp
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* User Message Bubble */
                      <div className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tr-none bg-gradient-to-r from-[#00C4CC] to-[#0099FF] px-3.5 py-2 sm:px-4 sm:py-2.5 text-black font-semibold shadow-md whitespace-pre-wrap text-xs sm:text-sm">
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading / Typing Animation */}
                {isLoading && (
                  <div className="flex items-start gap-2.5 animate-fade-in">
                    <div className="relative h-7 w-7 sm:h-8 sm:w-8 shrink-0 overflow-hidden rounded-full border border-[#00C4CC]/70 bg-black/90 p-0.5">
                      <Image
                        src="/images/robot-head.png"
                        alt="STH Assistant"
                        fill
                        sizes="32px"
                        className="object-cover rounded-full"
                      />
                    </div>
                    <div
                      className={`rounded-2xl rounded-tl-none px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-md flex items-center gap-1.5 ${
                        isLight
                          ? 'bg-white border border-slate-200'
                          : 'bg-[#162235] border border-slate-700/60'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-[#00C4CC] animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="h-2 w-2 rounded-full bg-[#00C4CC] animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="h-2 w-2 rounded-full bg-[#00C4CC] animate-bounce"></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ------------------------------------------------------------- */}
              {/* QUICK PROMPT SUGGESTIONS (Touch-friendly Horizontal Carousel)  */}
              {/* ------------------------------------------------------------- */}
              <div
                className={`shrink-0 border-t px-2.5 py-1.5 sm:px-3 sm:py-2 ${
                  isLight ? 'border-slate-200 bg-slate-100/90' : 'border-slate-800/60 bg-[#080D15]/90'
                }`}
              >
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      type="button"
                      onClick={() => handleSendMessage(prompt.query)}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition active:scale-95 touch-manipulation whitespace-nowrap ${
                        isLight
                          ? 'border-slate-300 bg-white text-slate-700 hover:border-[#00C4CC] hover:text-[#00C4CC]'
                          : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:border-[#00C4CC] hover:text-[#00C4CC]'
                      }`}
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* INPUT BAR (Touch Optimized with Safe Area Bottom Padding)      */}
              {/* ------------------------------------------------------------- */}
              <div
                className={`shrink-0 border-t p-2.5 pb-safe sm:p-3.5 ${
                  isLight ? 'border-slate-200 bg-white' : 'border-slate-800/80 bg-[#080D15]'
                }`}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className={`flex items-center gap-2 rounded-full border px-3 sm:px-3.5 py-1.5 shadow-inner transition focus-within:border-[#00C4CC] focus-within:ring-1 focus-within:ring-[#00C4CC] ${
                    isLight
                      ? 'border-slate-300 bg-slate-100'
                      : 'border-slate-700/80 bg-[#101B2B]'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className={`flex-1 bg-transparent text-xs sm:text-sm focus:outline-none disabled:opacity-50 min-w-0 ${
                      isLight
                        ? 'text-slate-900 placeholder:text-slate-400'
                        : 'text-white placeholder:text-slate-500'
                    }`}
                  />

                  {/* Circular Send Button with Paper Plane Icon */}
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    aria-label="Send message"
                    className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[#00C4CC] text-black shadow-[0_0_12px_rgba(0,196,204,0.6)] transition duration-200 hover:bg-[#00D9E3] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 transform translate-x-0.5"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
