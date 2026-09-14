/** Proof photos self-destruct after this long, keeping the shared database small. */
export const PROOF_EXPIRY_MS = 48 * 60 * 60 * 1000;

/** Sortable, collision-resistant id: base36 timestamp + random suffix. */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
