
# Reorganizar Transações por cartão / conta

Hoje a tela mistura todos os cartões e contas numa única lista. A ideia é deixar parecido com o app do banco: escolher **um cartão** e ver a **fatura do mês** (aberta, próximas e fechadas), ou escolher uma **conta** e ver **entradas x saídas** do mês.

## Nova estrutura da tela

```text
┌──────────────────────────────────────────────┐
│  [ Cartões ]  [ Contas ]  [ Tudo ]           │  ← abas
├──────────────────────────────────────────────┤
│  ● Nubank    ● Itaú    ● C6    ● Inter       │  ← chips (só na aba Cartões)
├──────────────────────────────────────────────┤
│  Fatura de Novembro/26   R$ 1.842,10         │
│  Fecha 03/11 · Vence 10/11 · aberta          │
│  ‹ Out  •  Nov (atual)  •  Dez  •  Jan ›     │  ← navegação de mês
├──────────────────────────────────────────────┤
│  Lançamentos da fatura                       │
│  03/11  Uber              R$   28,90         │
│  05/11  Mercado Extra     R$  312,45         │
│  ...                                          │
│  Parcelas futuras já lançadas: 4             │
└──────────────────────────────────────────────┘
```

Para **Contas** (débito / Pix / dinheiro):

```text
Conta Corrente Itaú — Novembro/26
Entradas  R$  9.700,00   Saídas  R$ 4.210,00   Saldo do mês  +R$ 5.490,00
[ Entradas ]  [ Saídas ]  [ Todas ]
```

## O que muda

1. **Abas no topo**: `Cartões` · `Contas` · `Tudo` (o modo atual).
2. **Seletor de cartão/conta** em chips coloridos logo abaixo das abas.
3. **Navegador de mês** (‹ anterior · atual · próximos ›) baseado no `closingDay` / `dueDay` do cartão.
   - Uma compra entra na fatura cujo fechamento é ≥ a data da compra.
   - Parcelas futuras já aparecem nas faturas correspondentes.
4. **Cabeçalho da fatura** com: mês, total, data de fechamento, data de vencimento, status (aberta / fechada / paga).
5. **Resumo Entradas x Saídas** em contas (e também em "Tudo") com totais e saldo do período.
6. **Lista** só das transações do cartão/conta e mês selecionados, ordenadas por data.
7. **Formulário de novo lançamento** e **importar PDF** continuam iguais (recolhidos em accordion no topo, como já são).
8. **Filtros antigos** (busca, categoria, tipo, mês) ficam ativos dentro da aba `Tudo`.

## Detalhes técnicos

- Novo helper `invoiceMonthOf(date, closingDay)` em `src/lib/finance.ts` → devolve o `YYYY-MM` da fatura de uma transação de cartão.
- Novo componente `CardInvoiceView` e `AccountLedgerView` dentro de `src/routes/app/transacoes.tsx` (mantém tudo numa rota só, sem novos arquivos de rota).
- Estado local: `viewMode: 'cards' | 'accounts' | 'all'`, `selectedCardId`, `selectedAccountId`, `invoiceOffset` (0 = mês atual, +1 = próximo, -1 = anterior).
- Reaproveita `transactions`, `cards`, `accounts` do `useData()`. Sem migração de banco.
- A lista da aba "Tudo" e o dedup do import de PDF continuam exatamente como estão.

## Fora do escopo

- Marcar fatura como paga / gerar transação de pagamento (posso fazer num passo seguinte).
- Mudar o formulário de novo lançamento.
- Mudar a importação de PDF.
