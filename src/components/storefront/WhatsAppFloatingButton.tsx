'use client';

export default function WhatsAppFloatingButton({ whatsappNumber }: { whatsappNumber: string | null }) {
  if (!whatsappNumber) return null;
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const href = `https://wa.me/${cleanNumber}?text=${encodeURIComponent('Hello STH Gadgets! \u{1F44B} I have a question about products. \u{1F6CD}\u{FE0F}')}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-glow transition hover:scale-105"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white">
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.8c-1.83 0-3.55-.48-5.04-1.32l-.36-.21-4.66 1.09 1.11-4.53-.24-.37A9.77 9.77 0 016.2 15c0-5.4 4.4-9.8 9.8-9.8 5.4 0 9.8 4.4 9.8 9.8 0 5.4-4.4 9.8-9.8 9.8zm5.4-7.34c-.29-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.29-.77.96-.94 1.16-.17.2-.35.22-.64.07-.29-.15-1.23-.45-2.34-1.44-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.35.44-.52.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.07-.79.37c-.27.29-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.62.71.23 1.35.2 1.86.12.57-.08 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.56-.35z" />
      </svg>
    </a>
  );
}
