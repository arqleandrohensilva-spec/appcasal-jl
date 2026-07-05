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
- category (escolha UMA): Alimentação, Moradia, Saúde, Transporte, Lazer, Vestuário, Educação, Assinaturas, Investimentos, Outros. Se type="transferencia", use "Transferência".
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
                ? 'Este é um print/screenshot direto da tela do banco — é nítido e legível. Extraia TODAS as transações visíveis em JSON estruturado, mesmo que a imagem esteja em resolução de celular. Não recuse por qualidade: se conseguir ler qualquer texto, extraia o que dá para ler.'
                : 'Extraia o extrato/fatura completo em JSON estruturado. Todas as transações.',
            },
            isImage
              ? {
                  type: 'image',
                  image: data.pdfDataUrl,
                  mediaType: detected,
                }
              : ({
                  type: 'file',
                  data: data.pdfDataUrl,
                  mediaType: detected,
                  filename,
                } as never),
          ],
        },
      ],
    });


    return result.experimental_output as ParsedStatement;
  });
