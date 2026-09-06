/**
 * Web Vibration API helper for subtle, native-feeling mobile haptic feedback.
 * Safe fallback for desktop or unsupported browsers.
 */

export function triggerHaptic(type = 'light') {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'selection':
      case 'light':
        // Ultra-subtle tick for tabs, filter chips, calendar days
        navigator.vibrate(10);
        break;

      case 'medium':
      case 'impact':
        // Slightly firmer tap for action buttons, FAB, modal opens
        navigator.vibrate(22);
        break;

      case 'success':
        // Rewarding double-tap for task completion, check-in, saved logs
        navigator.vibrate([15, 40, 20]);
        break;

      case 'warning':
      case 'error':
        // Noticeable pulse for delete, cancel, or warnings
        navigator.vibrate([25, 40, 30]);
        break;

      default:
        navigator.vibrate(10);
        break;
    }
  } catch {
    // Gracefully ignore if device disables or blocks vibration
  }
}
