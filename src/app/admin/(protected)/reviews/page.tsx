'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';

interface AdminReview {
  id: string;
  product_id: string;
  customer_name: string;
  phone: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_reply: string | null;
  helpful_count: number;
  created_at: string;
  products: { name: string; slug: string } | null;
}

const STATUSES = ['pending', 'approved', 'rejected'] as const;

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(value)}
      <span className="text-slate-600">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

export default function AdminReviewsPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${activeTab}&limit=50`);
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, payload: object) {
    setActionLoading((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setActionLoading((p) => ({ ...p, [id]: false }));
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this review permanently?')) return;
    setActionLoading((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    setActionLoading((p) => ({ ...p, [id]: false }));
    load();
  }

  const card = isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0C1420]';
  const ratingLabel = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`font-display text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
            ⭐ Customer Reviews
          </h1>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Moderate, reply, approve or reject customer reviews.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex rounded-xl border overflow-hidden w-fit ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
        {STATUSES.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider transition capitalize ${
              activeTab === tab
                ? 'bg-[#00C4CC] text-slate-950'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
        {loading ? 'Loading…' : `${total} ${activeTab} review${total !== 1 ? 's' : ''}`}
      </p>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl border p-4 animate-pulse ${card}`}>
              <div className={`h-3 w-1/3 rounded ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`} />
              <div className={`h-2 w-1/4 rounded mt-2 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
              <div className={`h-8 rounded mt-3 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className={`rounded-xl border p-8 text-center ${card}`}>
          <p className="text-2xl mb-2">✅</p>
          <p className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            No {activeTab} reviews
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className={`rounded-xl border p-4 space-y-3 ${card}`}>
              {/* Row 1: name, product, date */}
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {review.customer_name}
                    {review.phone && (
                      <span className={`ml-2 text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        📞 {review.phone}
                      </span>
                    )}
                  </p>
                  {review.products && (
                    <p className="text-xs text-[#00C4CC] mt-0.5">
                      📦 {review.products.name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StarDisplay value={review.rating} />
                  <span className={`text-[10px] font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {ratingLabel[review.rating]}
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(review.created_at).toLocaleDateString('en-PK', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Title + Body */}
              {review.title && (
                <p className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  {review.title}
                </p>
              )}
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {review.body}
              </p>

              {/* Existing reply */}
              {review.admin_reply && (
                <div className={`rounded-lg border-l-4 border-[#00C4CC] pl-3 pr-2 py-2 ${isLight ? 'bg-cyan-50' : 'bg-[#00C4CC]/10'}`}>
                  <p className="text-[10px] font-black text-[#00C4CC] uppercase tracking-wider mb-0.5">
                    Your Reply
                  </p>
                  <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {review.admin_reply}
                  </p>
                </div>
              )}

              {/* Admin reply textarea */}
              {replyOpen[review.id] && (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={replyDraft[review.id] ?? review.admin_reply ?? ''}
                    onChange={(e) => setReplyDraft((d) => ({ ...d, [review.id]: e.target.value }))}
                    placeholder="Write your reply to this customer…"
                    className={`w-full rounded-xl border px-3 py-2 text-xs resize-none focus:border-[#00C4CC] focus:outline-none ${isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-slate-700 bg-[#04080F] text-white'}`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        patch(review.id, { admin_reply: replyDraft[review.id] ?? '' });
                        setReplyOpen((o) => ({ ...o, [review.id]: false }));
                      }}
                      className="rounded-lg bg-[#00C4CC] px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-[#00D8E0] transition"
                    >
                      Save Reply
                    </button>
                    <button
                      onClick={() => setReplyOpen((o) => ({ ...o, [review.id]: false }))}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${isLight ? 'border-slate-300 text-slate-600' : 'border-slate-700 text-slate-400'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {activeTab === 'pending' && (
                  <>
                    <button
                      disabled={actionLoading[review.id]}
                      onClick={() => patch(review.id, { status: 'approved' })}
                      className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      disabled={actionLoading[review.id]}
                      onClick={() => patch(review.id, { status: 'rejected' })}
                      className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
                {activeTab === 'approved' && (
                  <button
                    disabled={actionLoading[review.id]}
                    onClick={() => patch(review.id, { status: 'rejected' })}
                    className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    Hide Review
                  </button>
                )}
                {activeTab === 'rejected' && (
                  <button
                    disabled={actionLoading[review.id]}
                    onClick={() => patch(review.id, { status: 'approved' })}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    ✓ Re-Approve
                  </button>
                )}
                <button
                  onClick={() => setReplyOpen((o) => ({ ...o, [review.id]: !o[review.id] }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                >
                  💬 {review.admin_reply ? 'Edit Reply' : 'Reply'}
                </button>
                <button
                  disabled={actionLoading[review.id]}
                  onClick={() => remove(review.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${isLight ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-rose-800 text-rose-400 hover:bg-rose-900/20'}`}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
