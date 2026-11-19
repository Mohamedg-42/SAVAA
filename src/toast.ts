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

/** Action pas encore branchée (PDF, appel, photo, export) : message complet, à formuler au cas par cas. */
export const simulate = (text: string) => showToast(text);

export function useToast() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => message,
  );
}
