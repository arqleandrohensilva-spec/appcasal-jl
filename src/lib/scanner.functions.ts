import { createServerFn } from '@tanstack/react-start';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createLovableAiGatewayProvider } from './ai-gateway.server';

const ItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
  category: z.string(),
});

const ReceiptSchema = z.object({
  merchant: z.string(),
  date: z.string(),
  total: z.number(),
  items: z.array(ItemSchema),
});

export type ScannedReceipt = z.infer<typeof ReceiptSchema>;

export const scanReceipt = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z.object({ imageDataUrl: z.string().min(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error('Missing LOVABLE_API_KEY');

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway('google/gemini-2.5-flash');

    const result = await generateText({
      model,
      experimental_output: Output.object({ schema: ReceiptSchema }),
      messages: [
        {
          role: 'system',
          content:
            'Você é um leitor de notas fiscais brasileiras. Extraia os dados estruturados em JSON. ' +
            'Categorias permitidas: Alimentação, Casa, Saúde, Transporte, Lazer, Vestuário, Educação, Assinaturas, Outros. ' +
            'Use a data no formato YYYY-MM-DD. Valores em reais (number). Se quantity não aparecer, use 1.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extraia o estabelecimento (merchant), data, total e a lista completa de itens (description, quantity, unitPrice, total, category sugerida).',
            },
            { type: 'image', image: data.imageDataUrl },
          ],
        },
      ],
    });

    return result.experimental_output as ScannedReceipt;
  });
