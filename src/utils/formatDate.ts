export function parseUTCDate(raw: string | Date): Date {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  
  if (typeof raw === 'string' && !raw.endsWith('Z') && !raw.includes('+')) {
    return new Date(raw + 'Z');
  }
  return new Date(raw);
}

export function formatActivityTime(raw: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = parseUTCDate(raw);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleString(undefined, options || defaultOptions);
}
