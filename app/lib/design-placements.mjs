// Unedited colors follow the first edited color; individual edits become overrides.
export function colorPlacement(layout, fallback, color) {
  return { ...fallback, ...layout?.base, ...layout?.colors?.[color] };
}
export function editColorPlacement(layout, fallback, color, changes) {
  const lead = layout?.lead ?? color;
  const next = { ...colorPlacement(layout, fallback, color), ...changes };
  return {
    ...layout, lead,
    base: lead === color ? next : layout?.base,
    colors: { ...layout?.colors, [color]: next },
  };
}
