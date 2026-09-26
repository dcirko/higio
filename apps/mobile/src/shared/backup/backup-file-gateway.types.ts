import type { HigioBackupDocument } from '@/domain/backup';

export type PickedBackupFile = {
  content: string;
  name: string;
  size: number | null;
};

export interface BackupFileGateway {
  pickBackup(): Promise<PickedBackupFile | null>;
  shareBackup(backup: HigioBackupDocument): Promise<void>;
}
