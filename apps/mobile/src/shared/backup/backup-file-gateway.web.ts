import type { BackupFileGateway } from '@/shared/backup/backup-file-gateway.types';

const UNAVAILABLE_MESSAGE =
  'Izvoz i povrat dostupni su u Android i iOS aplikaciji.';

export const backupFileGateway: BackupFileGateway = {
  async pickBackup() {
    throw new Error(UNAVAILABLE_MESSAGE);
  },
  async shareBackup() {
    throw new Error(UNAVAILABLE_MESSAGE);
  },
};
