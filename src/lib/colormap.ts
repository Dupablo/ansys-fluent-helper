/**
 * Jet colormap matching ANSYS Fluent's default contour colors.
 * Input: t in [0, 1] where 0 = cold (blue), 1 = hot (red).
 * Returns [r, g, b] each in [0, 255].
 */
export function jetColormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));

  let r: number, g: number, b: number;

  if (t < 0.125) {
    r = 0;
    g = 0;
    b = 0.5 + t / 0.125 * 0.5;
  } else if (t < 0.375) {
    r = 0;
    g = (t - 0.125) / 0.25;
    b = 1;
  } else if (t < 0.625) {
    r = (t - 0.375) / 0.25;
    g = 1;
    b = 1 - (t - 0.375) / 0.25;
  } else if (t < 0.875) {
    r = 1;
    g = 1 - (t - 0.625) / 0.25;
    b = 0;
  } else {
    r = 1 - (t - 0.875) / 0.125 * 0.5;
    g = 0;
    b = 0;
  }

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ];
}

export function valueToRgb(value: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  const [r, g, b] = jetColormap(t);
  return `rgb(${r},${g},${b})`;
}
