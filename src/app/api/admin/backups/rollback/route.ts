import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { executeRollbackOperation } from '@/lib/backup-restore';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { restoreHistoryId } = body;

    if (!restoreHistoryId) {
      return NextResponse.json({ error: 'restoreHistoryId is required' }, { status: 400 });
    }

    const result = await executeRollbackOperation(admin.userId, restoreHistoryId);

    return NextResponse.json({
      success: result.success,
      result,
      message: 'Database rollback executed successfully',
    });
  } catch (error: any) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { error: error.message || 'Rollback operation failed' },
      { status: 500 }
    );
  }
}
