'use client';

import React, { useState, useEffect } from 'react';

interface EmailActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyText: string;
}

export default function EmailActionModal({
  isOpen,
  onClose,
  recipientEmail,
  recipientName,
  subject,
  bodyText,
}: EmailActionModalProps) {
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditableSubject(subject);
      setEditableBody(bodyText);
      setCopied(false);
    }
  }, [isOpen, subject, bodyText]);

  if (!isOpen) return null;

  function handleCopy() {
    const fullText = `Subject: ${editableSubject}\n\n${editableBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleOpenGmail() {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail
    )}&su=${encodeURIComponent(editableSubject)}&body=${encodeURIComponent(editableBody)}`;
    window.open(gmailUrl, '_blank');
  }

  function handleOpenMailto() {
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
      editableSubject
    )}&body=${encodeURIComponent(editableBody)}`;
    window.location.href = mailtoUrl;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-blue-500/40 bg-[#0C1420] p-6 shadow-[0_0_35px_rgba(59,130,246,0.25)] text-[#C9D2DB]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-lg text-blue-400">
              ✉️
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">Send Email Confirmation</h3>
              <p className="text-xs text-slate-400">
                Send to <span className="text-white font-semibold">{recipientName}</span> ({recipientEmail})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="my-4 space-y-3.5">
          {copied && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-400 font-bold text-center">
              ✓ Email subject & text copied to clipboard! You can paste it into any webmail.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Recipient Email</label>
            <input
              type="text"
              readOnly
              value={recipientEmail}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs text-blue-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Subject</label>
            <input
              type="text"
              value={editableSubject}
              onChange={(e) => setEditableSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Message Body</label>
            <textarea
              rows={8}
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] p-3 text-xs text-white focus:border-blue-500 focus:outline-none font-sans leading-relaxed"
            />
          </div>
        </div>

        {/* Options / Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            📋 Copy Text
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenGmail}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
              title="Compose in Gmail Web in a new tab"
            >
              🔴 Compose in Gmail Web
            </button>

            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
              title="Open default system mail client"
            >
              🔵 Default Mail App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
