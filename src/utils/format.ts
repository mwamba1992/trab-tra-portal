type Cell = string | number | boolean | null | undefined;

/** YYYY-MM-DD in local time (toISOString() is UTC, the previous day before 03:00 in Tanzania). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayIso = (): string => isoDate(new Date());

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One display format for every date in the portal: "14 Sep 2026" ("-" when empty). */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match && value.length === 10) return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Backend enum-style values ("HEARING_SCHEDULED") as readable labels ("Hearing scheduled"). */
export function humanize(value: string | null | undefined): string {
  if (!value) return '-';
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** CSV with quoting for commas, quotes and newlines, and a leading apostrophe against spreadsheet formula injection. */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const cell = (value: Cell) => {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\n');
}

export function downloadCsv(fileName: string, headers: string[], rows: Cell[][]): void {
  const url = URL.createObjectURL(new Blob([toCsv(headers, rows)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
