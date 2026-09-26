import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { MAX_BACKUP_BYTES } from '@/domain/backup';
import type { BackupFileGateway } from '@/shared/backup/backup-file-gateway.types';

function createFileName(exportedAtUtc: string) {
  const compactTimestamp = exportedAtUtc
    .replaceAll(':', '-')
    .replace('.000Z', 'Z');
  return `higio-backup-${compactTimestamp}.json`;
}

class NativeBackupFileGateway implements BackupFileGateway {
  async pickBackup() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: 'application/json',
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      return null;
    }
    if (asset.size && asset.size > MAX_BACKUP_BYTES) {
      throw new Error('Sigurnosna kopija je veća od podržanih 5 MB.');
    }

    const file = new File(asset.uri);
    return {
      content: await file.text(),
      name: asset.name,
      size: asset.size ?? null,
    };
  }

  async shareBackup(backup: Parameters<BackupFileGateway['shareBackup']>[0]) {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Dijeljenje datoteke nije dostupno na ovom uređaju.');
    }

    const file = new File(Paths.cache, createFileName(backup.exportedAtUtc));
    file.create({ overwrite: true });
    file.write(JSON.stringify(backup, null, 2));

    try {
      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'Spremi Higio sigurnosnu kopiju',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } finally {
      if (file.exists) {
        file.delete();
      }
    }
  }
}

export const backupFileGateway: BackupFileGateway =
  new NativeBackupFileGateway();
