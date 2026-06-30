// Cálculo de data de pagamento ajustada (Brasil)
// - Se o dia não existir no mês (ex.: 31 em fev), usa o último dia do mês.
// - Se cair em sábado, domingo ou feriado nacional fixo, antecipa para o
//   dia útil anterior (regra padrão de folha de pagamento no Brasil).

const FIXED_HOLIDAYS_MMDD = new Set([
  '01-01', // Confraternização
  '04-21', // Tiradentes
  '05-01', // Trabalho
  '09-07', // Independência
  '10-12', // N. Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação
  '11-20', // Consciência Negra
  '12-25', // Natal
]);

// Páscoa (Meeus/Jones/Butcher) → feriados móveis: Carnaval (-47), Sexta Santa (-2), Corpus Christi (+60)
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function movableHolidays(year: number): Set<string> {
  const e = easter(year);
  return new Set([
    addDays(e, -47).toDateString(), // Carnaval (terça)
    addDays(e, -48).toDateString(), // Carnaval (segunda) — costuma ser ponto facultativo, incluímos por segurança
    addDays(e, -2).toDateString(),  // Sexta-feira Santa
    addDays(e, 60).toDateString(),  // Corpus Christi
  ]);
}

function isHoliday(d: Date): boolean {
  const mmdd = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  if (FIXED_HOLIDAYS_MMDD.has(mmdd)) return true;
  return movableHolidays(d.getFullYear()).has(d.toDateString());
}

function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  return !isHoliday(d);
}

/** Retorna o último dia válido do mês para um "dia desejado" (clampando 29-31). */
export function clampDayToMonth(year: number, monthIdx: number, desiredDay: number): Date {
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  return new Date(year, monthIdx, Math.min(desiredDay, lastDay));
}

/** Antecipa para o dia útil anterior se cair em fim de semana/feriado. */
export function previousBusinessDay(d: Date): Date {
  const x = new Date(d);
  while (!isBusinessDay(x)) x.setDate(x.getDate() - 1);
  return x;
}

/**
 * Próxima data de pagamento >= hoje, para um "dia fixo do mês",
 * clampada ao último dia do mês e antecipada se cair em fds/feriado.
 */
export function nextPayday(desiredDay: number, from: Date = new Date()): Date {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let candidate = previousBusinessDay(clampDayToMonth(base.getFullYear(), base.getMonth(), desiredDay));
  if (candidate < base) {
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    candidate = previousBusinessDay(clampDayToMonth(next.getFullYear(), next.getMonth(), desiredDay));
  }
  return candidate;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
