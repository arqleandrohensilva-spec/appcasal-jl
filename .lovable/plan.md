
Vou entregar as 5 features em **fases pequenas e testáveis**, para não quebrar o app numa PR gigante. Cada fase é um passo isolado que já sobe funcionando.

## Fase 1 — Tags livres (base, rápida)

Serve de fundação para os insights e o calendário filtrarem por tag.

- Migração: `ALTER TABLE transactions ADD COLUMN tags text[] DEFAULT '{}'`.
- Store: `UserTransaction.tags?: string[]`.
- UI no formulário de nova transação: input estilo "chips" (digita, enter, vira badge). Autocomplete puxando tags já usadas.
- Filtro por tag na aba "Tudo" de `/app/transacoes`.

## Fase 2 — Controle de fatura (pagar / status)

Em cima da view de fatura que já existe.

- Migração: `ALTER TABLE cards ADD COLUMN paid_invoices jsonb DEFAULT '{}'` (chave = `YYYY-MM`, valor = `{ paidAt, accountId, amount }`).
- No `CardInvoiceView`: header ganha status **aberta / fechada / paga** e botão **"Marcar como paga"**.
  - Abre modal: escolhe a conta de origem, confirma valor (default = total da fatura), data (default = hoje).
  - Gera uma transação de saída (`type: 'despesa'`, `category: 'Pagamento de fatura'`, `accountId: X`, `description: 'Fatura Nubank Nov/26'`) e marca `paid_invoices[monthKey]`.
- Fatura paga fica com badge verde e o total riscado; botão vira "Estornar pagamento".
- Alerta na home / no header do cartão: "Fatura fecha em X dias" / "Vence em Y dias".

## Fase 3 — Planejamento & metas do casal

Foco em dividir despesa e ver "quem deve a quem".

- Migração: `ALTER TABLE transactions ADD COLUMN split jsonb` — formato:
  ```json
  { "mode": "50_50" | "proporcional" | "custom",
    "leandro": 0.5, "jonathan": 0.5 }
  ```
- No formulário de transação com `owner = 'casal'`: seletor de rateio (50/50, proporcional à renda, custom com sliders).
- Novo widget na dashboard: **"Acerto do mês"** — soma o que cada um pagou vs o que devia pagar segundo o rateio, mostra saldo: *"Jonathan deve R$ 342,10 ao Leandro"*.
- Metas do casal: já existe `goal_contributions` com `owner`. Adicionar barra "quanto cada um contribuiu" na tela de metas (já temos `goalProgressByOwner`, só falta expor).

## Fase 4 — Calendário financeiro

Uma tela nova em `/app/calendario` (rota nova).

- Grade mensal (react calendar simples, sem lib pesada — CSS grid 7 colunas).
- Cada dia mostra: badge de entrada (verde), saída (vermelho), vencimento de fatura (laranja), meta (azul).
- Clicar num dia abre um `Sheet` com a lista de eventos do dia.
- Reaproveita `expandRecurring` + `getBillDueDate`. Sem novo backend.
- Botões: mês anterior / próximo, "Hoje".

## Fase 5 — Insights mensais

Widget na dashboard + página `/app/insights` com histórico.

- Novo módulo `src/lib/insights.ts` (já existe — vou estender) com regras:
  - **Categoria em alta**: variação % vs média dos últimos 3 meses (>+25% aciona insight).
  - **Assinaturas recorrentes**: agrupa por descrição normalizada + valor, se apareceu ≥3 meses seguidos, lista como assinatura; alerta se valor mudou.
  - **Sobra do mês**: (`receita − gastos − fatura estimada`) → sugere jogar % na meta prioritária.
  - **Comparativo casal**: quem gastou mais em cada categoria (só quando `profile = 'casal'`).
- Cada insight = card com título, texto curto, valor e CTA (ex.: "Ver transações da categoria").
- Sem IA / sem chamada de rede — tudo client-side em cima dos dados já carregados.

## Ordem de entrega

1. **Fase 1 (tags)** — 1 migração + form + filtro.
2. **Fase 2 (fatura paga)** — 1 migração + botão + modal + badge.
3. **Fase 5 (insights)** — só código client, sem migração.
4. **Fase 4 (calendário)** — rota nova, sem migração.
5. **Fase 3 (rateio casal)** — 1 migração + form + widget acerto.

Faço nessa ordem porque as 2 primeiras são as que mais destravam uso diário, insights e calendário aproveitam o que já existe, e rateio é a mais complexa (regra de negócio + UI).

## Fora de escopo agora

- Notificações push (fica para depois do calendário funcionar).
- Anexar comprovante em foto/PDF.
- IA nos insights.
- Exportar PDF do mês.

## Quer que eu comece?

Posso ir tocando **fase a fase**, mostrando o resultado antes de ir para a próxima. Ou, se preferir, faço as **fases 1 + 2 juntas** (as duas mais rápidas) e depois seguimos.
