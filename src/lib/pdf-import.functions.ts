import { createServerFn } from '@tanstack/react-start';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayProvider } from './ai-gateway.server';

const EntrySchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(['despesa', 'receita', 'transferencia']),
  category: z.string(),
  installmentCurrent: z.number().nullable(),
  installmentTotal: z.number().nullable(),
  transferReason: z.string().nullable(), // por que foi marcado como transferência (ex: "PIX entre contas próprias", "Pagamento de fatura")
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
    const model = gateway('google/gemini-2.5-flash');

    // Detecta mediaType a partir do data URL se não veio explícito
    const detected = data.mediaType
      || (data.pdfDataUrl.match(/^data:([^;]+);/)?.[1])
      || 'application/pdf';
    const isImage = detected.startsWith('image/');

    const system = `Você é especialista em extratos bancários e faturas de cartão brasileiros.
Analise o ${isImage ? 'PRINT DE TELA (imagem)' : 'PDF'} e extraia TODAS as transações reais visíveis.
${isImage ? 'Como é um print, pode ser apenas parte da fatura/extrato — extraia só o que estiver visível, sem inventar linhas cortadas.' : ''}

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
- date no formato YYYY-MM-DD. Se aparecer só dia/mês, use o ano do período do extrato (ou o ano atual se não aparecer).
- periodStart / periodEnd em YYYY-MM-DD. Se for print e não der pra determinar, use a primeira e última data visíveis.
- Retorne TODAS as transações visíveis, sem resumir.`;

    const filename = data.filename ?? (isImage ? 'print.png' : 'extrato.pdf');

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
              text: isImage
                ? 'Extraia todas as transações visíveis neste print em JSON estruturado.'
                : 'Extraia o extrato/fatura completo em JSON estruturado. Todas as transações.',
            },
            {
              type: 'file',
              data: data.pdfDataUrl,
              mediaType: detected,
              filename,
            } as never,
          ],
        },
      ],
    });

    return result.experimental_output as ParsedStatement;
  });
