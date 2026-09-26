export class StoreEvents {
  private readonly listeners = new Set<() => void>();

  emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
