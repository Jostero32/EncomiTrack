export const decimalTransformer = {
  to: (value?: string | number | null): string | null => {
    if (value === null || value === undefined) return null;
    return String(value);
  },
  from: (value?: string | number | null): string | null => {
    if (value === null || value === undefined) return null;
    return String(value);
  },
};
