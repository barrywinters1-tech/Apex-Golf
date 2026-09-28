/**
 * Delete with undo. Deletes happen immediately (so live queries update) and a toast
 * offers to put the row back for a few seconds — forgiveness instead of confirm dialogs.
 */
let toast = null; let timer = null;
const subs = new Set();
const emit = () => subs.forEach(f => f(toast));
export const subscribeToast = f => { subs.add(f); f(toast); return () => subs.delete(f); };
export const dismissToast = () => { clearTimeout(timer); toast = null; emit(); };

export function showToast(message, action) {
  clearTimeout(timer);
  toast = { id: Date.now(), message, action };
  emit();
  timer = setTimeout(dismissToast, 5000);
}

/** repo: a repo.js table object with get/remove/add. */
export async function removeWithUndo(repo, id, label = 'Deleted') {
  const row = await repo.get(id);
  await repo.remove(id);
  if (row) showToast(label, { label: 'Undo', run: () => repo.add(row) });
}
