export function cn(...inputs: (string | number | boolean | null | undefined)[]): string {
    return inputs.filter(Boolean).join(' ');
  }