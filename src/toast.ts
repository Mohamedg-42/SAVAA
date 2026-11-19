import { useSyncExternalStore } from 'react';

/* Message éphémère global (classe CSS `.toast`), affiché par <Toaster /> dans App. */

let message = '';
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(text: string, ms = 2800) {
  message = text;
  clearTimeout(timer);
  timer = setTimeout(() => {
    message = '';
    emit();
  }, ms);
  emit();
}

export function clearToast() {
  if (!message) return;
  clearTimeout(timer);
  message = '';
  emit();
}

/** Pour une action qui n'existe pas encore sans backend ou sans le téléphone (PDF, appel, photo, export…). */
export const simulate = (what: string) => showToast(`${what} : simulé dans la démo.`);

export function useToast() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => message,
  );
}
