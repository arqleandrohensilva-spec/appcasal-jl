import { createServerFn } from '@tanstack/react-start';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayProvider } from './ai-gateway.server';

const EntrySchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(['despesa', 'receita']),
  category: z.string(),
  installmentCurrent: z.number().nullable(),
  installmentTotal: z.number().nullable(),
});

const StatementSchema = z.object({
  statementType: z.enum(['card', 'account', 'unknown']),
  bank: z.string(),
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
        pdfDataUrl: z.string().min(20),
        filename: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error('Missing LOVABLE_API_KEY');

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway('google/gemini-2.5-flash');

    const system = `Você é especialista em extratos bancários e faturas de cartão brasileiros.
Analise o PDF e extraia TODAS as transações reais.

Regras:
- statementType: "card" se for fatura de cartão de crédito, "account" se for extrato de conta corrente/poupança, "unknown" só se realmente não der pra saber.
- IGNORE linhas de: saldo anterior, saldo do dia, total da fatura, pagamento de fatura anterior, subtotal, resumo por categoria, IOF acumulado informativo, juros já cobrados na linha do produto, encargos rotativos que aparecem duplicados no resumo. Se dúvida, prefira INCLUIR.
- description: nome LIMPO e legível do estabelecimento. Remova prefixos de adquirentes (PAG*, MP *, PP*, IFD*), códigos internos, sufixos de cidade/UF ("SAO PAULO BR"). Exemplos:
   "PAG*UBER TRIP HELP.UBE" -> "Uber"
   "MP *IFOOD" -> "iFood"
   "AMAZON.COM.BR SAO PAULO" -> "Amazon"
   "SUPERMERCADO XYZ LTDA" -> "Supermercado XYZ"
- amount: SEMPRE positivo (número, em reais). Nunca use string.
- type: "despesa" para gasto/débito/compra; "receita" para entrada/crédito/estorno/salário/pix recebido.
- Parcelamento: se a linha indicar parcela (ex: "PARC 03/10", "3/10", "10X", "PARCELA 3 DE 10"), preencha installmentCurrent (3) e installmentTotal (10). Caso à vista, use null nos dois campos.
- category (escolha UMA): Alimentação, Moradia, Saúde, Transporte, Lazer, Vestuário, Educação, Assinaturas, Investimentos, Outros.
- date no formato YYYY-MM-DD. Se aparecer só dia/mês, use o ano do período do extrato.
- periodStart / periodEnd em YYYY-MM-DD.
- Retorne TODAS as transações do PDF, sem resumir.`;

    const result = await generateText({
      model,
      experimental_output: Output.object({ schema: StatementSchema }),
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extraia o extrato/fatura completo em JSON estruturado. Todas as transações.',
            },
            {
              type: 'file',
              data: data.pdfDataUrl,
              mediaType: 'application/pdf',
              filename: data.filename ?? 'extrato.pdf',
            } as never,
          ],
        },
      ],
    });

    return result.experimental_output as ParsedStatement;
  });
