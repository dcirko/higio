import {
  parseBackupDocument,
  summarizeBackup,
  type BackupStore,
} from '@/domain/backup';

const UNAVAILABLE_MESSAGE =
  'Izvoz i povrat dostupni su u Android i iOS aplikaciji.';

export class UnavailableBackupStore implements BackupStore {
  readonly isAvailable = false;

  async createBackup(): Promise<never> {
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  inspectBackup(value: string) {
    return summarizeBackup(parseBackupDocument(value));
  }

  async restoreBackup(): Promise<never> {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
}
