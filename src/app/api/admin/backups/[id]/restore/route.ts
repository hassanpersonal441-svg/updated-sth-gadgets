import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { executeRestoreOperation } from '@/lib/backup-restore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: backupId } = await params;

  try {
    const body = await req.json();
    const { restoreType = 'full', selectedModules = [] } = body;

    if (restoreType !== 'full' && restoreType !== 'selective') {
      return NextResponse.json({ error: 'Invalid restoreType' }, { status: 400 });
    }

    const result = await executeRestoreOperation({
      adminId: admin.userId,
      backupId,
      restoreType,
      selectedModules,
    });

    return NextResponse.json({
      success: result.success,
      restoreRecord: result.restoreRecord,
      safetyBackup: result.safetyBackup,
      summary: result.summary,
    });
  } catch (error: any) {
    console.error('Restore operation error:', error);
    return NextResponse.json(
      { error: error.message || 'Restoration process failed' },
      { status: 500 }
    );
  }
}
