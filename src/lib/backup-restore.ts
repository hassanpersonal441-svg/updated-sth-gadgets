import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import type {
  BackupRecord,
  RestoreHistoryRecord,
  BackupModule,
  RestoreType,
  RestorePreviewData,
} from '@/types/database';

import { ALL_BACKUP_MODULES, resolveModuleDependencies } from './backup-restore-constants';
export { ALL_BACKUP_MODULES, resolveModuleDependencies };

export interface BackupPayload {
  version: string;
  schemaVersion: string;
  createdAt: string;
  backupName: string;
  backupType: string;
  recordCounts: Record<string, number>;
  data: {
    categories?: any[];
    products?: any[];
    product_images?: any[];
    coupons?: any[];
    coupon_usage?: any[];
    profiles?: any[];
    orders?: any[];
    order_items?: any[];
    invoices?: any[];
    invoice_items?: any[];
    settings?: any[];
    whatsapp_clicks?: any[];
  };
}

/**
 * 1. Generate Full Database Backup Snapshot and save to Supabase Storage & DB
 */
export async function generateBackupSnapshot(
  adminId?: string,
  customName?: string,
  backupType: 'manual' | 'safety_prerestore' | 'automated' = 'manual'
): Promise<BackupRecord> {
  const supabase = createServiceClient();
  const now = new Date();
  const timestampStr = now
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 16);

  let defaultName = `STH-Backup-${timestampStr}`;
  if (backupType === 'safety_prerestore') {
    defaultName = `PRE-RESTORE-${timestampStr}`;
  }
  const backupName = customName || defaultName;

  // Query all operational business tables
  const { data: categories } = await supabase.from('categories').select('*');
  const { data: products } = await supabase.from('products').select('*');
  const { data: product_images } = await supabase.from('product_images').select('*');
  const { data: coupons } = await supabase.from('coupons').select('*');
  const { data: coupon_usage } = await supabase.from('coupon_usage').select('*');
  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: orders } = await supabase.from('orders').select('*');
  const { data: order_items } = await supabase.from('order_items').select('*');
  const { data: invoices } = await supabase.from('invoices').select('*');
  const { data: invoice_items } = await supabase.from('invoice_items').select('*');
  const { data: settings } = await supabase.from('settings').select('*');
  const { data: whatsapp_clicks } = await supabase.from('whatsapp_clicks').select('*');

  const recordCounts: Record<string, number> = {
    categories: categories?.length || 0,
    products: products?.length || 0,
    product_images: product_images?.length || 0,
    coupons: coupons?.length || 0,
    coupon_usage: coupon_usage?.length || 0,
    customers: profiles?.length || 0,
    orders: orders?.length || 0,
    order_items: order_items?.length || 0,
    invoices: invoices?.length || 0,
    invoice_items: invoice_items?.length || 0,
    settings: settings?.length || 0,
    whatsapp_clicks: whatsapp_clicks?.length || 0,
  };

  const payload: BackupPayload = {
    version: '1.0',
    schemaVersion: '2026.09',
    createdAt: now.toISOString(),
    backupName,
    backupType,
    recordCounts,
    data: {
      categories: categories || [],
      products: products || [],
      product_images: product_images || [],
      coupons: coupons || [],
      coupon_usage: coupon_usage || [],
      profiles: profiles || [],
      orders: orders || [],
      order_items: order_items || [],
      invoices: invoices || [],
      invoice_items: invoice_items || [],
      settings: settings || [],
      whatsapp_clicks: whatsapp_clicks || [],
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const buffer = Buffer.from(jsonString, 'utf-8');
  const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');
  const fileName = `${backupName.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  const filePath = fileName;

  // Upload JSON payload to Supabase Storage 'backups' bucket (auto-create bucket if missing)
  let { error: uploadErr } = await supabase.storage
    .from('backups')
    .upload(filePath, buffer, {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadErr && (uploadErr.message?.includes('not found') || uploadErr.message?.includes('Bucket'))) {
    // Attempt auto-creating the 'backups' bucket using service client
    console.log("Bucket 'backups' not found. Creating storage bucket...");
    await supabase.storage.createBucket('backups', { public: false });
    
    // Retry upload
    const retry = await supabase.storage
      .from('backups')
      .upload(filePath, buffer, {
        contentType: 'application/json',
        upsert: true,
      });
    uploadErr = retry.error;
  }

  if (uploadErr) {
    console.error('Backup storage upload failed:', uploadErr);
    throw new Error(`Failed to store backup file in Supabase Storage: ${uploadErr.message}`);
  }

  // Insert database record into public.backups
  const { data: backupRecord, error: dbErr } = await supabase
    .from('backups')
    .insert({
      backup_name: backupName,
      backup_type: backupType,
      file_path: filePath,
      file_size: buffer.length,
      backup_version: '1.0',
      schema_version: '2026.09',
      created_by: adminId || null,
      created_at: now.toISOString(),
      status: 'success',
      record_counts: recordCounts,
      checksum,
    })
    .select()
    .single();

  if (dbErr || !backupRecord) {
    console.error('Backup DB record insertion failed:', dbErr);
    throw new Error(`Failed to record backup entry: ${dbErr?.message}`);
  }

  return backupRecord as BackupRecord;
}

/**
 * 2. Get current system record stats & last backup/restore info
 */
export async function getBackupSystemStats() {
  const supabase = createServiceClient();

  const [
    { count: categoriesCount },
    { count: productsCount },
    { count: imagesCount },
    { count: couponsCount },
    { count: ordersCount },
    { count: invoicesCount },
    { count: customersCount },
  ] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('product_images').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  const { data: lastBackup } = await supabase
    .from('backups')
    .select('*')
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastRestore } = await supabase
    .from('restore_history')
    .select('*, backup:backups!backup_id(*)')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    recordCounts: {
      categories: categoriesCount || 0,
      products: productsCount || 0,
      product_images: imagesCount || 0,
      coupons: couponsCount || 0,
      orders: ordersCount || 0,
      invoices: invoicesCount || 0,
      customers: customersCount || 0,
    },
    lastBackup: lastBackup as BackupRecord | null,
    lastRestore: lastRestore as RestoreHistoryRecord | null,
  };
}

/**
 * 3. Validate backup file & return preview structure
 */
export async function getBackupPreview(backupId: string): Promise<RestorePreviewData> {
  const supabase = createServiceClient();

  const { data: backup, error: fetchErr } = await supabase
    .from('backups')
    .select('*')
    .eq('id', backupId)
    .single();

  if (fetchErr || !backup) {
    throw new Error('Backup record not found');
  }

  // Download backup payload from storage
  const { data: fileData, error: downloadErr } = await supabase.storage
    .from('backups')
    .download(backup.file_path);

  if (downloadErr || !fileData) {
    throw new Error(`Failed to download backup file: ${downloadErr?.message || 'File unreadable'}`);
  }

  const text = await fileData.text();
  let payload: BackupPayload;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Corrupted backup file: Invalid JSON format');
  }

  const counts = payload.recordCounts || backup.record_counts || {};
  const total = Object.values(counts).reduce((sum, val) => sum + (Number(val) || 0), 0);

  return {
    backup: backup as BackupRecord,
    schemaVersion: payload.schemaVersion || '2026.09',
    compatible: true,
    moduleCounts: counts,
    totalRecords: total,
  };
}



/**
 * 5. Execute Full or Selective Restore (Creates safety backup first!)
 */
export async function executeRestoreOperation({
  adminId,
  backupId,
  restoreType,
  selectedModules = [],
}: {
  adminId: string;
  backupId: string;
  restoreType: RestoreType;
  selectedModules?: BackupModule[];
}): Promise<{
  success: boolean;
  restoreRecord: RestoreHistoryRecord;
  safetyBackup: BackupRecord;
  summary: {
    restoredCounts: Record<string, number>;
    failedCounts: Record<string, number>;
  };
}> {
  const supabase = createServiceClient();
  const startTime = new Date();

  // A. STEP 1: Create Mandatory Safety Backup of current live database
  let safetyBackup: BackupRecord;
  try {
    safetyBackup = await generateBackupSnapshot(
      adminId,
      undefined,
      'safety_prerestore'
    );
  } catch (safetyErr: any) {
    console.error('Safety backup failed prior to restore:', safetyErr);
    throw new Error(
      `Restore cancelled because the safety backup could not be created: ${safetyErr.message}`
    );
  }

  // B. STEP 2: Fetch and parse target backup payload
  const { data: backupRecord } = await supabase
    .from('backups')
    .select('*')
    .eq('id', backupId)
    .single();

  if (!backupRecord) {
    throw new Error('Target backup record not found');
  }

  const { data: fileData, error: downloadErr } = await supabase.storage
    .from('backups')
    .download(backupRecord.file_path);

  if (downloadErr || !fileData) {
    throw new Error('Target backup file could not be downloaded from Supabase Storage');
  }

  const payloadText = await fileData.text();
  const payload: BackupPayload = JSON.parse(payloadText);

  // C. STEP 3: Determine target modules to restore
  let targetModules: BackupModule[] = ALL_BACKUP_MODULES;
  if (restoreType === 'selective') {
    const { modulesToRestore } = resolveModuleDependencies(selectedModules);
    targetModules = modulesToRestore;
  }

  // Create initial restore history entry with status 'in_progress'
  const { data: historyRow } = await supabase
    .from('restore_history')
    .insert({
      backup_id: backupId,
      restore_type: restoreType,
      selected_modules: targetModules,
      safety_backup_id: safetyBackup.id,
      started_at: startTime.toISOString(),
      status: 'in_progress',
      records_restored: {},
      records_failed: {},
      restored_by: adminId,
    })
    .select()
    .single();

  const restoredCounts: Record<string, number> = {};
  const failedCounts: Record<string, number> = {};

  try {
    const d = payload.data || {};

    // Helper: Replace table contents
    const replaceTable = async (tableName: string, rows: any[]) => {
      if (!targetModules.includes(tableName as BackupModule) && restoreType === 'selective') {
        return; // Skip table if not included in selective restore
      }

      try {
        // Delete current rows in table
        await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (rows && rows.length > 0) {
          // Batch insert rows (in chunks of 100 to prevent payload limits)
          const chunkSize = 100;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const { error: insErr } = await supabase.from(tableName).insert(chunk);
            if (insErr) {
              console.error(`Error restoring chunk to ${tableName}:`, insErr);
              failedCounts[tableName] = (failedCounts[tableName] || 0) + chunk.length;
            } else {
              restoredCounts[tableName] = (restoredCounts[tableName] || 0) + chunk.length;
            }
          }
        } else {
          restoredCounts[tableName] = 0;
        }
      } catch (tableEx: any) {
        console.error(`Table restoration exception on ${tableName}:`, tableEx);
        failedCounts[tableName] = rows?.length || 0;
      }
    };

    // Restore tables in reverse dependency order to prevent FK violations
    // 1. Child item tables first (delete items before headers)
    if (targetModules.includes('invoice_items')) await replaceTable('invoice_items', d.invoice_items || []);
    if (targetModules.includes('order_items')) await replaceTable('order_items', d.order_items || []);
    if (targetModules.includes('coupon_usage')) await replaceTable('coupon_usage', d.coupon_usage || []);
    if (targetModules.includes('product_images')) await replaceTable('product_images', d.product_images || []);

    // 2. Parent headers
    if (targetModules.includes('invoices')) await replaceTable('invoices', d.invoices || []);
    if (targetModules.includes('orders')) await replaceTable('orders', d.orders || []);
    if (targetModules.includes('coupons')) await replaceTable('coupons', d.coupons || []);
    if (targetModules.includes('products')) await replaceTable('products', d.products || []);
    if (targetModules.includes('categories')) await replaceTable('categories', d.categories || []);

    // 3. Profiles & Settings
    if (targetModules.includes('customers') && d.profiles) {
      await replaceTable('profiles', d.profiles || []);
    }
    if (targetModules.includes('settings') && d.settings) {
      // For settings, update single row id=1
      if (d.settings.length > 0) {
        const { error: settErr } = await supabase
          .from('settings')
          .upsert(d.settings[0], { onConflict: 'id' });
        if (!settErr) restoredCounts.settings = 1;
        else failedCounts.settings = 1;
      }
    }

    const endTime = new Date();
    const hasFailures = Object.values(failedCounts).some((v) => v > 0);
    const finalStatus = hasFailures ? 'failed' : 'success';

    // Update restore history record
    const { data: updatedHistory } = await supabase
      .from('restore_history')
      .update({
        completed_at: endTime.toISOString(),
        status: finalStatus,
        records_restored: restoredCounts,
        records_failed: failedCounts,
        error_message: hasFailures ? 'Some records failed during restoration' : null,
      })
      .eq('id', historyRow.id)
      .select('*, backup:backups!backup_id(*)')
      .single();

    return {
      success: !hasFailures,
      restoreRecord: updatedHistory as RestoreHistoryRecord,
      safetyBackup,
      summary: {
        restoredCounts,
        failedCounts,
      },
    };
  } catch (err: any) {
    console.error('Fatal error during database restoration:', err);

    // Update history with failure status
    await supabase
      .from('restore_history')
      .update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: err.message || 'Fatal error during restoration',
      })
      .eq('id', historyRow.id);

    throw err;
  }
}

/**
 * 6. Rollback live database to pre-restore safety backup
 */
export async function executeRollbackOperation(
  adminId: string,
  restoreHistoryId: string
) {
  const supabase = createServiceClient();

  const { data: history } = await supabase
    .from('restore_history')
    .select('*, safety_backup:backups!safety_backup_id(*)')
    .eq('id', restoreHistoryId)
    .single();

  if (!history || !history.safety_backup_id) {
    throw new Error('Rollback failed: Safety backup record not found');
  }

  // Update rollback status to pending
  await supabase
    .from('restore_history')
    .update({ rollback_status: 'pending' })
    .eq('id', restoreHistoryId);

  try {
    const result = await executeRestoreOperation({
      adminId,
      backupId: history.safety_backup_id,
      restoreType: 'full',
      selectedModules: ALL_BACKUP_MODULES,
    });

    if (result.success) {
      await supabase
        .from('restore_history')
        .update({ rollback_status: 'success', status: 'rolled_back' })
        .eq('id', restoreHistoryId);
    } else {
      await supabase
        .from('restore_history')
        .update({ rollback_status: 'failed' })
        .eq('id', restoreHistoryId);
    }

    return result;
  } catch (err: any) {
    await supabase
      .from('restore_history')
      .update({ rollback_status: 'failed' })
      .eq('id', restoreHistoryId);
    throw err;
  }
}
