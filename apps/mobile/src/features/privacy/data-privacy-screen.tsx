import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useBackupStore } from '@/data/backup-store-context';
import {
  AppButton,
  AppSheet,
  AppText,
  Screen,
  Snackbar,
  Surface,
  ToggleRow,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import type { BackupSummary } from '@/domain/backup';
import { backupFileGateway } from '@/shared/backup/backup-file-gateway';
import { useAppSecurity } from '@/shared/security/app-security';

type PendingRestore = {
  content: string;
  fileName: string;
  summary: BackupSummary;
};

function formatExportedAt(value: string) {
  return new Intl.DateTimeFormat('hr-HR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zagreb',
  }).format(new Date(value));
}

function toFriendlyError(error: unknown) {
  if (error instanceof Error && error.message.length <= 180) {
    return error.message;
  }

  return 'Radnja se nije mogla dovršiti. Pokušaj ponovno.';
}

export default function DataPrivacyScreen() {
  const theme = useAppTheme();
  const backupStore = useBackupStore();
  const security = useAppSecurity();
  const [isBusy, setIsBusy] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);

  async function exportBackup() {
    setIsBusy(true);
    setMessage(null);

    try {
      const backup = await backupStore.createBackup();
      await backupFileGateway.shareBackup(backup);
      setMessage('Sigurnosna kopija je pripremljena za spremanje.');
    } catch (error) {
      setMessage(toFriendlyError(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function selectBackup() {
    setIsBusy(true);
    setMessage(null);

    try {
      const file = await backupFileGateway.pickBackup();
      if (!file) return;

      setPendingRestore({
        content: file.content,
        fileName: file.name,
        summary: backupStore.inspectBackup(file.content),
      });
    } catch (error) {
      setMessage(toFriendlyError(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function restoreBackup() {
    if (!pendingRestore) return;

    setIsBusy(true);
    setMessage(null);

    try {
      const restored = await backupStore.restoreBackup(pendingRestore.content);
      setPendingRestore(null);
      setMessage(
        `Vraćeno: ${restored.activities} aktivnosti i ${restored.logs} zapisa.`,
      );
    } catch (error) {
      setMessage(toFriendlyError(error));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <Screen contentStyle={styles.content} testID="data-privacy-screen">
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Natrag"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText variant="bodyLarge">‹</AppText>
          </Pressable>
          <View style={styles.headerCopy}>
            <AppText accessibilityRole="header" variant="heading" weight="bold">
              Podatci i privatnost
            </AppText>
            <AppText tone="muted" variant="caption">
              Sve ostaje lokalno na ovom uređaju
            </AppText>
          </View>
        </View>

        <Surface style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: theme.colors.primarySoft },
            ]}
          >
            <AppText tone="primary" variant="heading">
              ◈
            </AppText>
          </View>
          <View style={styles.heroCopy}>
            <AppText variant="bodyLarge" weight="bold">
              Tvoja lokalna sigurnosna kopija
            </AppText>
            <AppText tone="muted" variant="caption">
              Higio nema račun ni cloud. Izvezi JSON kopiju prije promjene ili
              resetiranja uređaja.
            </AppText>
          </View>
        </Surface>

        <View style={styles.section}>
          <AppText tone="subtle" variant="caption" weight="bold">
            SIGURNOSNA KOPIJA
          </AppText>
          <Surface style={styles.actionCard}>
            <View style={styles.actionCopy}>
              <AppText weight="bold">Izvezi podatke</AppText>
              <AppText tone="muted" variant="caption">
                Sprema aktivnosti, rasporede, povijest i korisničke postavke.
              </AppText>
            </View>
            <AppButton
              disabled={isBusy || !backupStore.isAvailable}
              label="Izvezi"
              onPress={() => void exportBackup()}
            />
          </Surface>

          <Surface style={styles.actionCard}>
            <View style={styles.actionCopy}>
              <AppText weight="bold">Vrati iz kopije</AppText>
              <AppText tone="muted" variant="caption">
                Datoteka se prvo provjerava. Ništa se ne mijenja bez tvoje
                potvrde.
              </AppText>
            </View>
            <AppButton
              disabled={isBusy || !backupStore.isAvailable}
              label="Odaberi"
              onPress={() => void selectBackup()}
              variant="secondary"
            />
          </Surface>
        </View>

        <View style={styles.section}>
          <AppText tone="subtle" variant="caption" weight="bold">
            ZAŠTITA UREĐAJA
          </AppText>
          <Surface style={styles.securityCard}>
            <ToggleRow
              description="Traži otisak prsta ili prepoznavanje lica nakon povratka u aplikaciju."
              label="Zaključaj Higio"
              onValueChange={(enabled) =>
                void security.setAppLockEnabled(enabled)
              }
              value={security.preferences.appLockEnabled}
            />
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.divider },
              ]}
            />
            <ToggleRow
              description="Skriva sadržaj u pregledu nedavnih aplikacija i blokira snimanje zaslona."
              label="Zaštiti privatni prikaz"
              onValueChange={(enabled) =>
                void security.setPrivacyProtectionEnabled(enabled)
              }
              value={security.preferences.privacyProtectionEnabled}
            />
          </Surface>
          {security.errorMessage ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.securityError,
                { backgroundColor: theme.colors.warningSurface },
              ]}
            >
              <AppText
                style={{ color: theme.colors.warningText }}
                variant="caption"
              >
                {security.errorMessage}
              </AppText>
            </View>
          ) : null}
        </View>

        {isBusy ? (
          <View accessibilityLiveRegion="polite" style={styles.busyRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <AppText tone="muted" variant="caption">
              Sigurno obrađujemo lokalne podatke…
            </AppText>
          </View>
        ) : null}

        <Surface style={styles.noteCard}>
          <AppText variant="label" weight="bold">
            Što se namjerno ne izvozi?
          </AppText>
          <AppText tone="muted" variant="caption">
            Biometrijske postavke i već zakazane sistemske obavijesti vezane su
            uz konkretan uređaj. Nakon povrata Higio ponovno usklađuje
            podsjetnike.
          </AppText>
        </Surface>

        {!backupStore.isAvailable ? (
          <AppText style={styles.centered} tone="muted" variant="caption">
            Izvoz i povrat provjeravaju se u Android ili iOS aplikaciji.
          </AppText>
        ) : null}
      </Screen>

      <AppSheet
        onClose={() => (isBusy ? undefined : setPendingRestore(null))}
        title="Potvrdi povrat podataka"
        visible={Boolean(pendingRestore)}
      >
        {pendingRestore ? (
          <View style={styles.restoreContent}>
            <View
              style={[
                styles.warningCard,
                { backgroundColor: theme.colors.warningSurface },
              ]}
            >
              <AppText
                style={{ color: theme.colors.warningText }}
                variant="label"
                weight="bold"
              >
                Trenutačni lokalni podatci bit će zamijenjeni.
              </AppText>
              <AppText
                style={{ color: theme.colors.warningText }}
                variant="caption"
              >
                Ova se radnja ne može poništiti. Preporučujemo da prije toga
                izvezeš sadašnje podatke.
              </AppText>
            </View>

            <Surface style={styles.summary}>
              <AppText numberOfLines={1} tone="muted" variant="caption">
                {pendingRestore.fileName}
              </AppText>
              <AppText weight="bold">
                {pendingRestore.summary.activities} aktivnosti ·{' '}
                {pendingRestore.summary.logs} zapisa
              </AppText>
              <AppText tone="muted" variant="caption">
                Izvezeno{' '}
                {formatExportedAt(pendingRestore.summary.exportedAtUtc)}
              </AppText>
            </Surface>

            <View style={styles.sheetActions}>
              <AppButton
                disabled={isBusy}
                label="Odustani"
                onPress={() => setPendingRestore(null)}
                variant="secondary"
              />
              <AppButton
                disabled={isBusy}
                label="Zamijeni podatke"
                onPress={() => void restoreBackup()}
              />
            </View>
          </View>
        ) : null}
      </AppSheet>

      <Snackbar message={message ?? ''} visible={Boolean(message)} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingBottom: spacing.huge },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  backButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  headerCopy: { flex: 1, gap: spacing.xxs },
  hero: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radii.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  actionCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  actionCopy: { flex: 1, gap: spacing.xs },
  busyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  noteCard: { gap: spacing.sm },
  securityCard: { gap: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  securityError: { borderRadius: radii.md, padding: spacing.md },
  centered: { textAlign: 'center' },
  restoreContent: { gap: spacing.lg },
  warningCard: { borderRadius: radii.md, gap: spacing.sm, padding: spacing.md },
  summary: { gap: spacing.xs },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});
