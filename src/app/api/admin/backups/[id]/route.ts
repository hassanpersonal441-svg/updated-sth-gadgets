import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';
import { getBackupPreview } from '@/lib/backup-restore';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isDownload = req.nextUrl.searchParams.get('download') === 'true';

  try {
    const supabase = createServiceClient();
    const preview = await getBackupPreview(id);

    if (isDownload) {
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from('backups')
        .download(preview.backup.file_path);

      if (downloadErr || !fileData) {
        return NextResponse.json(
          { error: `Download failed: ${downloadErr?.message || 'File not found'}` },
          { status: 404 }
        );
      }

      const buffer = await fileData.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${preview.backup.backup_name}.json"`,
        },
      });
    }

    return NextResponse.json({ preview });
  } catch (error: any) {
    console.error('Error handling backup detail route:', error);
    return NextResponse.json({ error: error.message || 'Backup error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const { data: backup, error: fetchErr } = await supabase
      .from('backups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // 1. Delete file from storage bucket
    const { error: storageErr } = await supabase.storage
      .from('backups')
      .remove([backup.file_path]);

    if (storageErr) {
      console.warn('Could not remove file from storage:', storageErr);
    }

    // 2. Delete database record
    const { error: dbErr } = await supabase
      .from('backups')
      .delete()
      .eq('id', id);

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete backup' }, { status: 500 });
  }
}
