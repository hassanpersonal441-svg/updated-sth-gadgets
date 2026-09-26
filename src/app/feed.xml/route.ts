import { GET as getGoogleFeed } from '../api/feed/google-merchant/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  return getGoogleFeed();
}
