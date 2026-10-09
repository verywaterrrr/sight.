export function pageWindow(start, total, landscape) {
  if (!total) return [];
  const size = Math.min(landscape ? 2 : 1, total);
  const anchor = Math.max(0, Math.min(total - size, start));
  return Array.from({ length: size }, (_, i) => anchor + i);
}
export function changePart(state, id, checked) {
  if (state.mode === 'rhythm') state.selected = checked ? new Set([id]) : new Set();
  else if (checked) state.selected.add(id); else state.selected.delete(id);
}
export function enterRhythm(state) {
  state.saved = new Set(state.selected); state.selected = new Set(); state.mode = 'rhythm';
}
export function leaveRhythm(state) {
  state.selected = new Set(state.saved); state.mode = 'notes';
}
