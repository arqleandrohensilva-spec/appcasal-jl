import { createServerFn } from '@tanstack/react-start';
import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayProvider } from './ai-gateway.server';


// Schema tolerante: campos opcionais em vez de .nullable() estrito, pois
// o Gemini às vezes omite chaves — validamos e normalizamos depois.
const EntrySchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(['despesa', 'receita', 'transferencia']),
  category: z.string(),
  installmentCurrent: z.number().nullish().optional(),
  installmentTotal: z.number().nullish().optional(),
  transferReason: z.string().nullish().optional(),
});


const StatementSchema = z.object({
  statementType: z.enum(['card', 'account', 'unknown']),
  bank: z.string(),
  invoiceMonth: z.string().nullish().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  entries: z.array(EntrySchema),
});

export type StatementEntry = z.infer<typeof EntrySchema>;
export type ParsedStatement = z.infer<typeof StatementSchema>;

export const parseBankStatement = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z
      .object({
        // aceita PDF ou imagem (print) — data URL base64
        pdfDataUrl: z.string().min(20),
        filename: z.string().optional(),
        mediaType: z.string().optional(), // ex: application/pdf, image/png, image/jpeg
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error('Missing LOVABLE_API_KEY');

    const gateway = createLovableAiGatewayProvider(key);

    // Detecta mediaType a partir do data URL se não veio explícito
    const detected = data.mediaType
      || (data.pdfDataUrl.match(/^data:([^;]+);/)?.[1])
      || 'application/pdf';
    const isImage = detected.startsWith('image/');

    // Para prints/imagens tentamos primeiro o Pro (melhor OCR de screenshots de
    // celular), mas caímos para o Flash automaticamente se der 402/429/5xx —
    // assim o import nunca falha por rate limit ou créditos do Pro.
    const primaryModelId = isImage ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
    const fallbackModelId = 'google/gemini-2.5-flash';
    const currentYear = new Date().getFullYear();

    const system = `Você é especialista em extratos bancários e faturas de cartão brasileiros.
Analise o ${isImage ? 'PRINT DE TELA (imagem, geralmente screenshot de app de celular)' : 'PDF'} e extraia TODAS as transações reais visíveis.
${isImage ? `IMPORTANTE (prints de app de banco/cartão):
- Cada transação normalmente ocupa UMA LINHA/CARTÃO com: nome do estabelecimento, data, e valor à direita (ex: "R$ 45,90" ou "-R$ 45,90").
- A informação de parcela geralmente aparece LOGO ABAIXO ou AO LADO do nome, em cinza/fonte menor: "Parcela 3/10", "3 de 10", "3/10", "3ª de 10x", "10x de R$ 45,90".
- Se o valor mostrado for da PARCELA (ex: "R$ 45,90" com "3/10"), esse é o amount da linha — NÃO multiplique pelo total.
- LEIA COM ATENÇÃO valores pequenos, cinza e sobrepostos — o print é nítido.
- Extraia SEMPRE description + amount + date + installment quando visíveis, mesmo que a lista esteja recortada.
` : ''}
Regras:

- statementType: "card" se for fatura de cartão de crédito, "account" se for extrato de conta corrente/poupança, "unknown" só se realmente não der pra saber.
- IGNORE linhas de: saldo anterior, saldo do dia, total da fatura, pagamento de fatura anterior, subtotal, resumo por categoria, IOF acumulado informativo, juros já cobrados na linha do produto, encargos rotativos que aparecem duplicados no resumo. Se dúvida, prefira INCLUIR.
- description: nome LIMPO e legível do estabelecimento. Remova prefixos de adquirentes (PAG*, MP *, PP*, IFD*), códigos internos, sufixos de cidade/UF ("SAO PAULO BR"). Exemplos:
   "PAG*UBER TRIP HELP.UBE" -> "Uber"
   "MP *IFOOD" -> "iFood"
   "AMAZON.COM.BR SAO PAULO" -> "Amazon"
   "SUPERMERCADO XYZ LTDA" -> "Supermercado XYZ"
- amount: SEMPRE positivo (número, em reais). Nunca use string.
- type:
   * "despesa" para gasto/débito/compra real com terceiros.
   * "receita" para entrada/crédito de terceiros (salário, PIX recebido de outra pessoa, estorno).
   * "transferencia" (IMPORTANTE, para não poluir os relatórios) — use quando a linha NÃO for gasto nem receita de verdade, e sim movimentação interna. Sinais típicos:
     - "Transferência entre contas próprias", "TRANSF ENTRE CONTAS", "TED MESMA TITULARIDADE", "DOC MESMA TITULARIDADE".
     - PIX enviado/recebido em que remetente e destinatário são a MESMA pessoa (mesmo nome do titular do extrato, mesmo CPF).
     - "Aplicação automática", "Resgate automático", "Investimento CDB/Tesouro", "Poupança - depósito/saque", "RDB", "Aplicação em fundo".
     - "Pagamento de fatura cartão", "PAGTO CARTÃO", "DEBITO AUTOMATICO FATURA CARTAO" (é quitação de fatura, não gasto novo).
     - "Saque em caixa/ATM" (dinheiro só mudou de lugar).
     - "Estorno de transferência", "Devolução PIX" quando cancela uma transferência anterior.
   Em caso de dúvida entre despesa/receita e transferência, escolha "transferencia" só se houver sinal claro; senão mantenha despesa/receita.
- transferReason: quando type="transferencia", explique em 3-6 palavras (ex: "PIX entre contas próprias", "Pagamento fatura cartão", "Aplicação CDB"). Nos outros tipos, use null.
- Parcelamento: se a linha indicar parcela (ex: "PARC 03/10", "3/10", "10X", "PARCELA 3 DE 10"), preencha installmentCurrent (3) e installmentTotal (10). Caso à vista, use null nos dois campos. Nunca marque transferência como parcelada.
- Para fatura de cartão, preencha invoiceMonth no formato YYYY-MM com o mês da FATURA que está sendo importada (ex: "Fatura de Julho/2026", "Jul/26" ou vencimento em julho => "2026-07"). Não confunda com periodEnd: se o ciclo fecha em junho mas a fatura/vencimento é julho, invoiceMonth deve ser julho. Para extrato de conta, use null.
- Parcelamento: se a linha indicar parcela (ex: "PARC 03/10", "3/10", "10X", "PARCELA 3 DE 10"), preencha installmentCurrent (3) e installmentTotal (10) exatamente como aparece na fatura. Caso à vista, use null nos dois campos. Nunca marque transferência como parcelada.
- category (escolha UMA): Alimentação, Moradia, Saúde, Transporte, Lazer, Vestuário, Educação, Assinaturas, Investimentos, Outros. Se type="transferencia", use "Transferência".
- date no formato YYYY-MM-DD. Se aparecer só dia/mês, use o ano do período do extrato; se o ano não aparecer no print, use ${currentYear}.
- periodStart / periodEnd em YYYY-MM-DD. Se for print e não der pra determinar, use a primeira e última data visíveis.
- Retorne TODAS as transações visíveis, sem resumir.
- O JSON final deve ser UM OBJETO com a chave "entries". Não use array na raiz e não use a chave "transactions".`;

    const filename = data.filename ?? (isImage ? 'print.png' : 'extrato.pdf');

    const messages = [
      { role: 'system' as const, content: system },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: isImage
              ? 'Este é um print/screenshot direto da tela do banco — é nítido e legível. Extraia TODAS as transações visíveis em JSON estruturado, mesmo que a imagem esteja em resolução de celular. Não recuse por qualidade: se conseguir ler qualquer texto, extraia o que dá para ler.'
              : 'Extraia o extrato/fatura completo em JSON estruturado. Todas as transações.',
          },
          isImage
            ? { type: 'image' as const, image: data.pdfDataUrl, mediaType: detected }
            : ({ type: 'file', data: data.pdfDataUrl, mediaType: detected, filename } as never),
        ],
      },
    ];

    // Normaliza o payload que veio do modelo para o formato esperado.
    const normalize = (raw: unknown): ParsedStatement => {
      const container = Array.isArray(raw) ? raw[0] : raw;
      const anyRaw = container as { entries?: unknown[]; transactions?: unknown[]; [k: string]: unknown };
      const rawEntries = Array.isArray(anyRaw?.entries)
        ? anyRaw.entries
        : Array.isArray(anyRaw?.transactions)
          ? anyRaw.transactions
          : [];

      if (rawEntries.length > 0 && !Array.isArray(anyRaw.entries)) {
        raw = { ...anyRaw, entries: rawEntries };
      } else {
        raw = container;
      }

      const parsed = StatementSchema.safeParse(raw);
      if (parsed.success) {
        return {
          ...parsed.data,
          invoiceMonth: parsed.data.invoiceMonth ?? null,
          entries: parsed.data.entries.map(e => ({
            ...e,
            installmentCurrent: e.installmentCurrent ?? null,
            installmentTotal: e.installmentTotal ?? null,
            transferReason: e.transferReason ?? null,
          })),
        };
      }
      // Fallback: tenta manter só as entries que casam.
      const entries = rawEntries.flatMap(e => {
            const p = EntrySchema.safeParse(e);
            if (!p.success) return [];
            return [{
              ...p.data,
              installmentCurrent: p.data.installmentCurrent ?? null,
              installmentTotal: p.data.installmentTotal ?? null,
              transferReason: p.data.transferReason ?? null,
            }];
          });
      return {
        statementType: (anyRaw?.statementType as ParsedStatement['statementType']) ?? 'unknown',
        bank: (anyRaw?.bank as string) ?? '',
        invoiceMonth: (anyRaw?.invoiceMonth as string | null) ?? null,
        periodStart: (anyRaw?.periodStart as string) ?? '',
        periodEnd: (anyRaw?.periodEnd as string) ?? '',
        entries,
      };
    };

    const isRetriableGatewayError = (err: unknown): boolean => {
      const anyErr = err as { statusCode?: number; status?: number; message?: string; data?: { error?: { code?: number } } } | undefined;
      const code = anyErr?.statusCode ?? anyErr?.status ?? anyErr?.data?.error?.code;
      if (code === 402 || code === 429 || (typeof code === 'number' && code >= 500)) return true;
      const msg = anyErr?.message ?? '';
      return /402|429|payment required|rate limit|quota|overloaded|unavailable|insufficient/i.test(msg);
    };

    const runWithModel = async (modelId: string) => {
      const result = await generateText({
        model: gateway(modelId),
        experimental_output: Output.object({ schema: StatementSchema }),
        messages,
      });
      return normalize(result.experimental_output);
    };

    const attempt = async (modelId: string) => {
      try {
        return await runWithModel(modelId);
      } catch (err) {
        if (NoObjectGeneratedError.isInstance(err) && err.text) {
          try {
            const cleaned = err.text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
            const raw = JSON.parse(cleaned);
            return normalize(raw);
          } catch {
            // segue para o throw
          }
        }
        throw err;
      }
    };

    try {
      return await attempt(primaryModelId);
    } catch (err) {
      if (primaryModelId !== fallbackModelId && isRetriableGatewayError(err)) {
        console.warn(`[pdf-import] ${primaryModelId} falhou (${(err as { statusCode?: number }).statusCode ?? 'err'}), tentando ${fallbackModelId}`);
        return await attempt(fallbackModelId);
      }
      throw err;
    }
  });

