import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateBackupSnapshot } from '@/lib/backup-restore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = createServiceClient();
    const { data: lastBackup, error: lastBackupError } = await service
      .from('backups')
      .select('id, created_at, backup_type')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastBackupError) throw lastBackupError;

    const now = Date.now();
    const lastCreatedAt = lastBackup ? new Date(lastBackup.created_at).getTime() : 0;
    const hoursSinceLastBackup = lastCreatedAt ? (now - lastCreatedAt) / (1000 * 60 * 60) : Infinity;

    if (hoursSinceLastBackup < 24) {
      return NextResponse.json({
        success: true,
        created: false,
        reason: 'A successful backup was created less than 24 hours ago.',
        lastBackup: lastBackup?.created_at,
      });
    }

    const backup = await generateBackupSnapshot(undefined, undefined, 'automated');
    return NextResponse.json({ success: true, created: true, backup });
  } catch (error: any) {
    console.error('Automatic backup failed:', error);
    return NextResponse.json({ error: error.message || 'Automatic backup failed' }, { status: 500 });
  }
}