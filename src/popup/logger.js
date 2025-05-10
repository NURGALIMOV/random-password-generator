export function logEvent(event, details = {}) {
  // Можно расширить для отправки на сервер или в консоль
  console.log(`[event] ${event}`, details);
}

export function logError(error, context = "") {
  console.error(`[error] ${context}`, error);
} 