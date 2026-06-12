# Diagnóstico do Casal — Funcionalidades propostas

Quando o perfil ativo é **Casal**, o dashboard ganha um painel exclusivo que combina os dados de Leandro + Jonathan (contas, cartões e transações dos dois). Hoje esse modo só repete os mesmos cards individuais. A ideia é torná-lo o **cérebro financeiro do casal**.

## 1. Melhor cartão do casal (prioridade — você pediu)

Widget que considera **todos os cartões dos dois** e responde:
- "Quero gastar R$ X hoje. Qual cartão usar?"
- Ranking por **margem de segurança** na data do vencimento (saldo projetado da conta do dono - fatura total).
- Mostra: dono do cartão, data de vencimento, fatura atual, saldo projetado do dono no vencimento, sobra após pagar.
- Avisa se **nenhum dos dois** consegue pagar com folga e sugere dividir em parcelas ou usar conta.

Já temos `recommendCardForPurchase` — basta rodar em modo casal somando ambos os perfis.

## 2. Saldo consolidado do casal (dia a dia)

Versão "casal" da Projeção Diária:
- Soma saldos das contas dos dois.
- Mostra **duas linhas** no gráfico: saldo Leandro + saldo Jonathan + linha total.
- Destaca dias críticos: "Dia 10/07 a conta do Leandro fica negativa, mas o Jonathan tem folga — transferir R$ X resolve".
- Sugestões de **transferência entre contas** para equilibrar.

## 3. Quem paga o quê este mês

Tabela de **divisão de despesas compartilhadas**:
- Lista contas marcadas como "compartilhadas" (categoria casa, mercado, etc.).
- Calcula quanto cada um pagou no mês.
- Mostra **saldo entre eles**: "Jonathan deve R$ 240 ao Leandro" ou "Está empatado".
- Botão "Quitar dívida" registra uma transferência.

## 4. Capacidade de compra conjunta

Card "Podemos comprar?":
- Input: valor de um objetivo (ex: R$ 5.000 viagem).
- Mostra: quanto tempo levaria juntando a sobra mensal dos dois, ou se cabe parcelando em quantos meses considerando renda + gastos fixos do casal.

## 5. Fatura do mês consolidada

Visão única de **todas as faturas de cartão dos dois** ordenadas por data de vencimento, com total do mês e alerta: "Próximos 30 dias: R$ 4.820 em faturas. Saldo combinado projetado: R$ 5.100. Margem apertada."

## 6. Comparativo de comportamento

Mini-cards lado a lado:
- Quem gasta mais por categoria neste mês.
- Quem está dentro do orçamento e quem estourou.
- "Categoria onde mais divergem": ex. Leandro gasta 3x mais em delivery.

## 7. Metas conjuntas com contribuição individual

Para cada meta do casal, mostrar quanto cada um já contribuiu (barra dividida em duas cores) e o ritmo de cada um.

## Plano de implementação (técnico)

- Criar `src/components/dashboard/CoupleDiagnostic.tsx` agrupando os widgets acima.
- Renderizar **apenas quando `activeProfile === 'casal'`**, entre o grid de KPIs e a Projeção Diária.
- Ampliar `src/lib/projections.ts`:
  - `projectCoupleBalance(accounts, cards, transactions)` — projeção com séries separadas por dono + total.
  - `recommendCardForPurchase` já aceita `profile='casal'` — usar direto.
- Adicionar flag opcional `shared?: boolean` em `UserTransaction` (não-quebrante) para alimentar o item 3.
- Sem backend novo — tudo roda em cima do `useData()` existente.

## Escopo desta entrega

Sugiro começar pelos 3 mais úteis no dia a dia:
1. **Melhor cartão do casal** (o que você pediu)
2. **Saldo consolidado dia a dia** com alerta de desequilíbrio entre contas
3. **Fatura do mês consolidada** com alerta de margem

Os itens 3 (divisão), 4 (capacidade), 6 (comparativo) e 7 (metas) ficam para uma segunda leva, ou me diz se quer puxar algum deles pra frente.

Aprova assim, ou quer trocar/adicionar algum item antes de eu implementar?
