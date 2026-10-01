'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  body: string;
  admin_reply: string | null;
  helpful_count: number;
  created_at: string;
}

interface ReviewStats {
  total: number;
  avg: number;
  distribution: Record<number, number>;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

/* ── Interactive star picker ── */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const active = hover || value;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="text-3xl transition-all duration-100 hover:scale-125 focus:outline-none"
          >
            <span className={active >= s ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]' : 'text-slate-700'}>
              ★
            </span>
          </button>
        ))}
      </div>
      {active > 0 && (
        <span className="text-xs font-bold text-amber-400 tracking-wide">{labels[active]}</span>
      )}
    </div>
  );
}

/* ── Static star display ── */
function Stars({ value, size = 'sm' }: { value: number; size?: 'xs' | 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xs';
  return (
    <span className={cls}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= value ? 'text-amber-400' : 'text-slate-700'}>★</span>
      ))}
    </span>
  );
}

/* ── Rating bar row ── */
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group cursor-default">
      <span className="text-xs font-bold text-slate-400 w-3 text-right shrink-0">{star}</span>
      <span className="text-amber-400 text-[10px] shrink-0">★</span>
      <div className="flex-1 h-[6px] rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-4 text-right shrink-0">{count}</span>
    </div>
  );
}

/* ── Avatar with gradient background ── */
function Avatar({ name }: { name: string }) {
  const colors = [
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-700',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-indigo-500 to-blue-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-black text-base shadow-lg`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, avg: 0, distribution: {} });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({ customer_name: '', phone: '', rating: 0, title: '', review_body: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`);
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setStats({ total: data.total, avg: data.avg, distribution: data.distribution ?? {} });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.customer_name.trim()) return setFormError('Please enter your name.');
    if (form.rating === 0) return setFormError('Please select a star rating.');
    if (form.review_body.trim().length < 10) return setFormError('Review must be at least 10 characters.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) setFormError(data.error || 'Something went wrong.');
      else { setSubmitted(true); setForm({ customer_name: '', phone: '', rating: 0, title: '', review_body: '' }); }
    } catch { setFormError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  function toggleExpand(id: string) {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const TRUNCATE_AT = 180;
  const ratingLabel = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  /* shared input style */
  const input = `w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00C4CC]/40 focus:border-[#00C4CC] ${
    isLight
      ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
      : 'border-slate-700/60 bg-[#070E19] text-white placeholder:text-slate-600'
  }`;

  return (
    <section className={`rounded-2xl overflow-hidden border ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800/60 bg-[#080F1A]'}`}>

      {/* ══ TOP HEADER BAR ══ */}
      <div className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b ${isLight ? 'border-slate-100' : 'border-slate-800/60'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-400/10 border border-amber-400/20'}`}>
            ⭐
          </div>
          <div>
            <h2 className={`font-display text-sm font-black tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Customer Reviews
            </h2>
            {stats.total > 0 && (
              <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                {stats.total} verified review{stats.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="group flex items-center gap-1.5 rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] text-slate-950 px-4 py-2 text-xs font-black shadow-[0_0_16px_rgba(0,196,204,0.3)] transition-all hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(0,196,204,0.45)]"
          >
            <span className="text-sm">✍️</span>
            Write a Review
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">

        {/* ══ RATING SUMMARY ══ */}
        {stats.total > 0 && (
          <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row gap-6 items-center ${isLight ? 'border-slate-100 bg-slate-50/60' : 'border-slate-800/50 bg-[#050B14]'}`}>
            {/* Big score */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className={`font-display text-6xl font-black leading-none tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {stats.avg.toFixed(1)}
              </span>
              <Stars value={Math.round(stats.avg)} size="lg" />
              <span className={`text-[11px] font-semibold mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                out of 5
              </span>
            </div>

            {/* Divider */}
            <div className={`hidden sm:block w-px self-stretch ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

            {/* Bars */}
            <div className="flex-1 w-full space-y-2.5">
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar key={s} star={s} count={stats.distribution[s] ?? 0} total={stats.total} />
              ))}
            </div>

            {/* Divider */}
            <div className={`hidden sm:block w-px self-stretch ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

            {/* Quick stats */}
            <div className="flex sm:flex-col gap-4 sm:gap-3 shrink-0 text-center">
              <div>
                <p className={`font-display text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {stats.distribution[5] ?? 0}
                </p>
                <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>5-star</p>
              </div>
              <div>
                <p className="font-display text-2xl font-black text-[#00C4CC]">
                  {stats.total > 0 ? Math.round(((stats.distribution[4] ?? 0) + (stats.distribution[5] ?? 0)) / stats.total * 100) : 0}%
                </p>
                <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Positive</p>
              </div>
            </div>
          </div>
        )}

        {/* ══ SUBMIT SUCCESS ══ */}
        {submitted && (
          <div className={`rounded-2xl border p-6 text-center space-y-3 ${isLight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
            <div className="text-3xl">🎉</div>
            <div>
              <p className={`font-bold text-base ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                Thank you for your review!
              </p>
              <p className={`text-xs mt-1 ${isLight ? 'text-emerald-700' : 'text-emerald-600'}`}>
                Your review will appear once approved by our team.
              </p>
            </div>
            <button
              onClick={() => { setSubmitted(false); setShowForm(false); }}
              className={`text-xs font-semibold underline-offset-2 underline ${isLight ? 'text-slate-400' : 'text-slate-500'}`}
            >
              Close
            </button>
          </div>
        )}

        {/* ══ WRITE REVIEW FORM ══ */}
        {showForm && !submitted && (
          <div className={`rounded-2xl border overflow-hidden ${isLight ? 'border-slate-200' : 'border-slate-700/50'}`}>
            {/* Form header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800/60 bg-[#050B14]'}`}>
              <p className={`font-display text-xs font-bold uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Your Review · <span className="text-[#00C4CC]">{productName}</span>
              </p>
              <button
                onClick={() => { setShowForm(false); setFormError(''); }}
                className={`text-lg leading-none transition ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-600 hover:text-slate-300'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Star picker */}
              <div className={`rounded-xl border p-4 space-y-2 ${isLight ? 'border-amber-100 bg-amber-50/50' : 'border-amber-500/10 bg-amber-500/5'}`}>
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Your Rating *
                </label>
                <StarPicker value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
              </div>

              {/* Name + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Your Name *
                  </label>
                  <input
                    value={form.customer_name}
                    onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                    placeholder="e.g. Ali Hassan"
                    className={input}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Phone <span className="normal-case font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="03xx-xxxxxxx"
                    className={input}
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Headline <span className="normal-case font-normal opacity-60">(optional)</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Summarise your experience in a few words"
                  className={input}
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Your Review *
                </label>
                <textarea
                  value={form.review_body}
                  onChange={(e) => setForm((f) => ({ ...f, review_body: e.target.value }))}
                  placeholder="Tell others what you think about this product — quality, value, delivery…"
                  rows={4}
                  className={`${input} resize-none`}
                />
                <p className={`text-[10px] text-right ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                  {form.review_body.length} / min 10 chars
                </p>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                  <span className="text-rose-400 text-sm">⚠️</span>
                  <p className="text-xs text-rose-400 font-semibold">{formError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] text-slate-950 py-3 text-sm font-black shadow-[0_0_20px_rgba(0,196,204,0.3)] transition hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full" /> Submitting…</>
                  ) : (
                    <><span>📤</span> Submit Review</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormError(''); }}
                  className={`rounded-xl border px-5 py-3 text-sm font-bold transition hover:scale-[1.01] ${isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══ REVIEWS LIST ══ */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className={`rounded-2xl border p-5 animate-pulse space-y-3 ${isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800/50 bg-[#050B14]'}`}>
                <div className="flex gap-3 items-center">
                  <div className={`w-10 h-10 rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                  <div className="space-y-2 flex-1">
                    <div className={`h-3 w-1/3 rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                    <div className={`h-2 w-1/5 rounded-full ${isLight ? 'bg-slate-100' : 'bg-slate-700'}`} />
                  </div>
                </div>
                <div className={`h-2 w-1/4 rounded-full ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
                <div className={`h-12 rounded-xl ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          /* Empty state */
          <div className={`rounded-2xl border border-dashed p-10 text-center space-y-3 ${isLight ? 'border-slate-200' : 'border-slate-700/50'}`}>
            <div className="text-4xl">💬</div>
            <div>
              <p className={`font-display font-bold text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                No reviews yet
              </p>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                Be the first to share your experience with this product!
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mx-auto mt-1 flex items-center gap-1.5 rounded-xl bg-[#00C4CC]/10 hover:bg-[#00C4CC]/20 border border-[#00C4CC]/30 text-[#00C4CC] px-5 py-2 text-xs font-bold transition"
              >
                ✍️ Write the First Review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const isLong = review.body.length > TRUNCATE_AT;
              const isExpanded = expandedReviews.has(review.id);
              const displayBody = isLong && !isExpanded ? review.body.slice(0, TRUNCATE_AT) + '…' : review.body;

              return (
                <div
                  key={review.id}
                  className={`rounded-2xl border p-5 space-y-3.5 transition-all ${isLight ? 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm' : 'border-slate-800/50 bg-[#050B14] hover:border-slate-700/60'}`}
                >
                  {/* ── Review Header ── */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={review.customer_name} />
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {review.customer_name}
                        </p>
                        <p className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(review.created_at).toLocaleDateString('en-PK', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Stars + label (right side) */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <Stars value={review.rating} size="sm" />
                      <span className={`text-[10px] font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                        {ratingLabel[review.rating]}
                      </span>
                    </div>
                  </div>

                  {/* ── Title ── */}
                  {review.title && (
                    <p className={`font-display font-bold text-sm leading-snug ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {review.title}
                    </p>
                  )}

                  {/* ── Body ── */}
                  <div>
                    <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      {displayBody}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => toggleExpand(review.id)}
                        className="mt-1.5 text-xs font-bold text-[#00C4CC] hover:underline"
                      >
                        {isExpanded ? 'Show less ▲' : 'Read more ▼'}
                      </button>
                    )}
                  </div>

                  {/* ── Admin Reply ── */}
                  {review.admin_reply && (
                    <div className={`rounded-xl p-3.5 flex gap-3 ${isLight ? 'bg-cyan-50 border border-cyan-100' : 'bg-[#00C4CC]/8 border border-[#00C4CC]/15'}`}>
                      <div className="shrink-0 w-6 h-6 rounded-full bg-[#00C4CC] flex items-center justify-center text-slate-950 text-xs font-black mt-0.5">
                        S
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-[#00C4CC] uppercase tracking-widest mb-1">
                          STH Gadgets · Official Response
                        </p>
                        <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          {review.admin_reply}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Footer ── */}
                  <div className={`flex items-center gap-3 pt-1 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/60'}`}>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Verified Purchase
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
