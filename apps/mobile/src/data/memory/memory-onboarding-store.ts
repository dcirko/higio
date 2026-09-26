import type { OnboardingState, OnboardingStore } from '@/domain/onboarding';

export type MemoryOnboardingSnapshot = { completedAtUtc: string | null };

export class MemoryOnboardingStore implements OnboardingStore {
  private completedAtUtc: Date | null;
  private readonly listeners = new Set<() => void>();

  constructor(
    snapshot?: MemoryOnboardingSnapshot,
    private readonly onChange?: (snapshot: MemoryOnboardingSnapshot) => void,
  ) {
    this.completedAtUtc = snapshot?.completedAtUtc
      ? new Date(snapshot.completedAtUtc)
      : null;
  }

  async getState(): Promise<OnboardingState> {
    return {
      completedAtUtc: this.completedAtUtc,
      isCompleted: this.completedAtUtc !== null,
    };
  }

  async complete() {
    this.completedAtUtc = new Date();
    this.onChange?.({ completedAtUtc: this.completedAtUtc.toISOString() });
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
