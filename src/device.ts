import { showToast } from './toast';

/* Fonctions du navigateur et du téléphone utilisées par les écrans. */

/**
 * Lit une image choisie sur l'appareil et la réduit (640 px de côté, JPEG),
 * pour qu'elle tienne dans le stockage du navigateur.
 */
export function readImage(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image illisible'));
    };
    img.src = url;
  });
}

/** Partage natif du téléphone, sinon copie du lien. */
export async function share(title: string, text: string) {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast('Lien copié.');
  } catch (e) {
    if ((e as Error).name !== 'AbortError') showToast('Partage impossible sur cet appareil.');
  }
}

/** Télécharge un tableau en CSV (séparateur « ; », lisible par Excel en français). */
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Ouvre l'impression ; « Enregistrer en PDF » y est proposé par le navigateur. */
export function printPage() {
  window.print();
}
