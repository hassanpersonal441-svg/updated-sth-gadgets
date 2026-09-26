import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';
import { generateBackupSnapshot, getBackupSystemStats } from '@/lib/backup-restore';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const stats = await getBackupSystemStats();

    const { data: backups, error: backupsErr } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false });

    if (backupsErr) {
      return NextResponse.json({ error: backupsErr.message }, { status: 500 });
    }

    const { data: restoreHistory, error: historyErr } = await supabase
      .from('restore_history')
      .select('*, backup:backups!backup_id(*)')
      .order('started_at', { ascending: false })
      .limit(30);

    if (historyErr) {
      return NextResponse.json({ error: historyErr.message }, { status: 500 });
    }

    return NextResponse.json({
      stats,
      backups: backups || [],
      restoreHistory: restoreHistory || [],
    });
  } catch (error: any) {
    console.error('Error fetching backup data:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const customName = body.customName?.trim() || undefined;

    const backup = await generateBackupSnapshot(admin.userId, customName, 'manual');

    return NextResponse.json({
      success: true,
      backup,
      message: 'Backup generated successfully',
    });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate backup' }, { status: 500 });
  }
}
