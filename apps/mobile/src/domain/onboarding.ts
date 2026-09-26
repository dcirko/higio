export type OnboardingState = {
  completedAtUtc: Date | null;
  isCompleted: boolean;
};

export interface OnboardingStore {
  complete(): Promise<void>;
  getState(): Promise<OnboardingState>;
  subscribe?(listener: () => void): () => void;
}
