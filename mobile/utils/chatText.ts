const TABLE_SEP_CELL = /^:?-{3,}:?$/;
const TABLE_SEP_LINE = /^\s*:?-{3,}:?\s*$/;

function flattenTableRow(line: string): string | null {
  const cells = line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

  if (cells.length > 0 && cells.every((cell) => TABLE_SEP_CELL.test(cell))) {
    return null;
  }

  return cells.join(' · ');
}

/** Normaliza markdown/escapes del Asistente IA para mostrar y copiar igual. */
export function normalizeChatText(raw: string): string {
  if (!raw) return '';

  const unescaped = raw
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = unescaped.split('\n').map((line) => {
    const trimmedEnd = line.replace(/\s+$/, '');

    if (TABLE_SEP_LINE.test(trimmedEnd)) return null;

    if (/^\s*\|/.test(trimmedEnd)) {
      return flattenTableRow(trimmedEnd);
    }

    return trimmedEnd
      .replace(/^\s*[-*]\s+/, '• ')
      .replace(/^\s*(\d+)\.\s+/, '$1. ');
  });

  return lines
    .filter((line): line is string => line !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
