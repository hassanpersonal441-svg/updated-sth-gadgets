import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 text-center">
      <h1 className="font-display text-6xl font-bold text-electric-bright">404</h1>
      <p className="mt-3 font-display text-lg text-silver-bright">This page went out of stock.</p>
      <p className="mt-1 text-sm text-silver-dim">The page you're looking for doesn't exist or has moved.</p>
      <Link href="/" className="mt-6 rounded-xl bg-electric px-6 py-2.5 font-display text-sm font-semibold text-black hover:brightness-110">
        Back to Home
      </Link>
    </div>
  );
}
