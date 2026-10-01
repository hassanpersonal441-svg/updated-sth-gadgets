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

function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const sz = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-sm';
  return (
    <div className={`flex gap-0.5 ${sz}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`transition-transform ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          disabled={!onChange}
        >
          <span className={(hover || value) >= star ? 'text-amber-400' : 'text-slate-600'}>★</span>
        </button>
      ))}
    </div>
  );
}

function RatingBar({
  star,
  count,
  total,
  isLight,
}: {
  star: number;
  count: number;
  total: number;
  isLight: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-4 text-right font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{star}</span>
      <span className="text-amber-400 text-[10px]">★</span>
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-7 text-right ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{count}</span>
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

  // Form state
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    rating: 0,
    title: '',
    review_body: '',
  });
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
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.customer_name.trim()) return setFormError('Please enter your name.');
    if (form.rating === 0) return setFormError('Please select a star rating.');
    if (form.review_body.trim().length < 10)
      return setFormError('Review must be at least 10 characters.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Something went wrong.');
      } else {
        setSubmitted(true);
        setForm({ customer_name: '', phone: '', rating: 0, title: '', review_body: '' });
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const ratingLabel = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  // Card background
  const card = isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0C1420]';

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 space-y-6 ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0C1420]'}`}>
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className={`font-display text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <span>⭐</span> Customer Reviews
          {stats.total > 0 && (
            <span className={`text-xs font-normal ml-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ({stats.total})
            </span>
          )}
        </h2>
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] text-slate-950 px-4 py-2 text-xs font-black shadow transition hover:scale-[1.02]"
          >
            ✍️ Write a Review
          </button>
        )}
      </div>

      {/* ── Rating Summary ── */}
      {stats.total > 0 && (
        <div className={`rounded-xl border p-4 flex flex-col sm:flex-row gap-5 items-center ${card}`}>
          {/* Big average */}
          <div className="flex flex-col items-center shrink-0">
            <span className={`font-display text-5xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {stats.avg.toFixed(1)}
            </span>
            <StarRating value={Math.round(stats.avg)} size="md" />
            <span className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              out of 5 · {stats.total} review{stats.total !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Distribution bars */}
          <div className="flex-1 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => (
              <RatingBar
                key={s}
                star={s}
                count={stats.distribution[s] ?? 0}
                total={stats.total}
                isLight={isLight}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Write Review Form ── */}
      {submitted ? (
        <div className={`rounded-xl border p-4 text-center space-y-1 ${isLight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
          <p className="text-xl">🎉</p>
          <p className={`font-bold text-sm ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
            Thank you for your review!
          </p>
          <p className={`text-xs ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}>
            It will be visible after admin approval.
          </p>
          <button
            onClick={() => { setSubmitted(false); setShowForm(false); }}
            className={`mt-2 text-xs underline ${isLight ? 'text-slate-500' : 'text-slate-400'}`}
          >
            Close
          </button>
        </div>
      ) : showForm ? (
        <form
          onSubmit={handleSubmit}
          className={`rounded-xl border p-4 space-y-4 ${card}`}
        >
          <h3 className={`font-display text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Review: {productName}
          </h3>

          {/* Star picker */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Your Rating *
            </label>
            <div className="flex items-center gap-3">
              <StarRating value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} size="lg" />
              {form.rating > 0 && (
                <span className={`text-xs font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                  {ratingLabel[form.rating]}
                </span>
              )}
            </div>
          </div>

          {/* Name + Phone row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Your Name *
              </label>
              <input
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                placeholder="e.g. Ali Hassan"
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:border-[#00C4CC] focus:outline-none ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-[#04080F] text-white placeholder:text-slate-600'}`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Phone (optional)
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="03xx-xxxxxxx"
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:border-[#00C4CC] focus:outline-none ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-[#04080F] text-white placeholder:text-slate-600'}`}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Review Title (optional)
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Summarise your experience"
              className={`w-full rounded-xl border px-3 py-2 text-xs focus:border-[#00C4CC] focus:outline-none ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-[#04080F] text-white placeholder:text-slate-600'}`}
            />
          </div>

          {/* Body */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Your Review *
            </label>
            <textarea
              value={form.review_body}
              onChange={(e) => setForm((f) => ({ ...f, review_body: e.target.value }))}
              placeholder="Share your honest experience about this product…"
              rows={4}
              className={`w-full rounded-xl border px-3 py-2 text-xs resize-none focus:border-[#00C4CC] focus:outline-none ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-[#04080F] text-white placeholder:text-slate-600'}`}
            />
          </div>

          {formError && (
            <p className="text-xs text-rose-500 font-semibold">{formError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] text-slate-950 py-2.5 text-xs font-black shadow transition hover:scale-[1.01] disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : '📤 Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(''); }}
              className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${isLight ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {/* ── Reviews List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className={`rounded-xl border p-4 animate-pulse ${card}`}>
              <div className={`h-3 w-1/3 rounded ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`} />
              <div className={`h-2 w-1/4 rounded mt-2 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
              <div className={`h-10 rounded mt-3 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className={`rounded-xl border p-6 text-center ${card}`}>
          <p className="text-2xl mb-2">💬</p>
          <p className={`text-sm font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            No reviews yet
          </p>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`rounded-xl border p-4 space-y-2 ${card}`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Avatar */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#00C4CC]/20 border border-[#00C4CC]/40 flex items-center justify-center text-[#00C4CC] font-black text-sm">
                    {review.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {review.customer_name}
                    </p>
                    <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(review.created_at).toLocaleDateString('en-PK', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  <StarRating value={review.rating} size="sm" />
                  <span className={`text-[10px] font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {ratingLabel[review.rating]}
                  </span>
                </div>
              </div>

              {/* Title */}
              {review.title && (
                <p className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  {review.title}
                </p>
              )}

              {/* Body */}
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {review.body}
              </p>

              {/* Admin reply */}
              {review.admin_reply && (
                <div className={`rounded-lg border-l-4 border-[#00C4CC] pl-3 pr-2 py-2 mt-1 ${isLight ? 'bg-cyan-50' : 'bg-[#00C4CC]/10'}`}>
                  <p className="text-[10px] font-black text-[#00C4CC] uppercase tracking-wider mb-0.5">
                    🛍️ STH Gadgets Reply
                  </p>
                  <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {review.admin_reply}
                  </p>
                </div>
              )}

              {/* Verified badge */}
              <div className="flex items-center gap-1 pt-1">
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  ✓ Verified Purchase
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
