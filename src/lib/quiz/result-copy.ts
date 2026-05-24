export function performanceMessage(accuracy: number) {
  if (accuracy >= 90) return "Elite command. You read the arena beautifully.";
  if (accuracy >= 75) return "Strong run. A little review turns this into mastery.";
  if (accuracy >= 50) return "Solid foundation. The review cards will sharpen the next attempt.";
  return "Good start. Slow down, review the signals, and come back sharper.";
}
