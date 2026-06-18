import Papa from 'papaparse';
import type { UserTransaction } from './store';
import type { UserProfile } from './context';

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  const csv = Papa.unparse(rows, { quotes: true });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function transactionsToCSV(txs: UserTransaction[]) {
  return txs.map(t => ({
    Data: t.date,
    Descrição: t.description,
    Categoria: t.category,
    Tipo: t.type,
    Valor: t.amount.toFixed(2).replace('.', ','),
    Pagamento: t.paymentMethod,
    Parcela: t.installmentInfo ? `${t.installmentInfo.current}/${t.installmentInfo.total}` : '',
    Recorrência: t.recurrence || 'none',
    Dono: t.owner,
  }));
}

export interface ParsedRow {
  date: string;
  description: string;
  amount: number; // sempre absoluto
  type: 'receita' | 'despesa';
  category?: string;
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  // dd/mm/yyyy
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function normalizeAmount(s: string | number): number | null {
  if (typeof s === 'number') return s;
  if (!s) return null;
  const clean = String(s)
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : null;
}

/**
 * Faz parse de um CSV genérico e tenta detectar colunas Data, Descrição, Valor, Categoria.
 * Suporta separador vírgula ou ponto-e-vírgula, datas dd/mm/yyyy ou yyyy-mm-dd,
 * valores no formato brasileiro (1.234,56) ou inglês (1234.56).
 */
export function parseCSV(text: string): { rows: ParsedRow[]; raw: any[]; headers: string[]; errors: string[] } {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [',', ';', '\t', '|'],
  });
  const headers = parsed.meta.fields || [];
  const lower = headers.map(h => h.toLowerCase());

  const findCol = (...keys: string[]) =>
    headers[lower.findIndex(h => keys.some(k => h.includes(k)))];

  const dateCol = findCol('data', 'date');
  const descCol = findCol('descri', 'description', 'historico', 'histórico', 'memo');
  const amountCol = findCol('valor', 'amount', 'value');
  const catCol = findCol('categoria', 'category');

  if (!dateCol || !descCol || !amountCol) {
    errors.push('Não foi possível detectar as colunas de Data, Descrição e Valor.');
    return { rows: [], raw: parsed.data, headers, errors };
  }

  const rows: ParsedRow[] = [];
  for (const r of parsed.data) {
    const date = normalizeDate(r[dateCol] || '');
    const description = (r[descCol] || '').trim();
    const amountNum = normalizeAmount(r[amountCol] || '');
    if (!date || !description || amountNum === null) continue;
    rows.push({
      date,
      description,
      amount: Math.abs(amountNum),
      type: amountNum < 0 ? 'despesa' : 'receita',
      category: catCol ? (r[catCol] || '').trim() : undefined,
    });
  }
  return { rows, raw: parsed.data, headers, errors };
}

export function dedupeAgainstExisting(rows: ParsedRow[], existing: UserTransaction[], owner: UserProfile): {
  toImport: ParsedRow[];
  duplicates: ParsedRow[];
} {
  const key = (date: string, amount: number, desc: string) =>
    `${date}::${amount.toFixed(2)}::${desc.toLowerCase().slice(0, 30)}`;
  const existingKeys = new Set(
    existing
      .filter(t => owner === 'casal' || t.owner === owner)
      .map(t => key(t.date, Math.abs(t.amount), t.description)),
  );
  const toImport: ParsedRow[] = [];
  const duplicates: ParsedRow[] = [];
  for (const r of rows) {
    if (existingKeys.has(key(r.date, r.amount, r.description))) duplicates.push(r);
    else toImport.push(r);
  }
  return { toImport, duplicates };
}
