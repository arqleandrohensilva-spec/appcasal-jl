# Plano de Melhorias

Vou executar em 3 ondas. As ondas 1 e 2 são frontend puro (localStorage) e entregam ganho imediato. A onda 3 é a migração para Lovable Cloud, que toca tudo — por isso fica separada e te peço confirmação antes.

## Onda 1 — Polimento + edição + exportação (entrego de uma vez)

**Correções**
- Corrigir warning de hydration no `Slider` do Comparador e Consórcio (já existe `mounted` em alguns, padronizar com um wrapper `<ClientOnly>`).

**UX / Tema**
- Adicionar toggle Dark/Light na sidebar, persistido em localStorage, com transição suave. Usa tokens já existentes em `src/styles.css`.
- Briefing diário mais inteligente: substituir o texto fixo por mensagens dinâmicas baseadas em `pendingThisMonth`, `categoryAnomalies`, `openCardBills` e saldo projetado (ex.: "Fatura do Nubank fecha em 2 dias — R$ 1.240", "Alimentação 62% acima da média de 3 meses", "Sobra estimada do mês: R$ 1.890").

**Edição/exclusão facilitadas**
- Diálogo de edição para Transação, Meta, Cartão e Conta (hoje só dá pra criar e excluir).
- Adicionar `updateTransaction`, `updateGoal`, `updateCard`, `updateAccount` no `store.tsx`.
- Filtros e busca na página de Transações (por descrição, categoria, mês, tipo).

**Exportar / importar**
- Botão "Exportar CSV" em Transações (gera arquivo direto no navegador, sem servidor).
- Botão "Importar extrato" com upload CSV. Suporta:
  - Formato Nubank (Data, Valor, Identificador, Descrição)
  - Formato genérico (Data, Descrição, Valor, Categoria opcional)
  - Tela de mapeamento de colunas + preview antes de confirmar
  - Detecção de duplicatas por (data + valor + descrição)

## Onda 2 — Orçamento mensal por categoria

- Nova entidade `Budget { id, category, monthlyLimit, owner }` no store.
- Nova página `/app/orcamento`:
  - Lista de categorias com gasto do mês vs limite (barra de progresso colorida).
  - Cadastrar/editar limite por categoria e por perfil.
  - Alerta visual quando passa de 80% (amarelo) e 100% (vermelho).
- Card "Orçamento" no Dashboard mostrando as 3 categorias mais próximas do limite.
- Alerta no Briefing Diário quando alguma categoria estourar.
- Item de menu novo na sidebar.

## Onda 3 — Lovable Cloud (só depois da sua confirmação)

Esta onda é uma migração grande: todos os dados saem do localStorage e vão para o banco. Requer:

- Ativar Lovable Cloud (cria backend automático).
- Login com Email/Senha + Google (sem precisar de conta externa).
- Tabelas: `profiles`, `accounts`, `cards`, `transactions`, `goals`, `goal_contributions`, `budgets` + RLS por usuário (e regra especial para o perfil "casal" — provavelmente via campo `couple_id` ligando 2 contas).
- Migrar `src/lib/store.tsx` de localStorage para queries no Supabase (server functions onde fizer sentido).
- Tela de login + rota `_authenticated` protegendo `/app/*`.
- Botão "Importar do dispositivo atual" no primeiro login pra trazer os dados do localStorage pra Cloud, sem perder histórico.

**Por que separar:** essa onda mexe em praticamente todos os arquivos de página e introduz auth. Se algo der errado, é melhor isolar do polimento. Também preciso fazer perguntas suas antes (ex.: como você quer modelar o "casal" — duas contas separadas que compartilham dados, ou uma conta única com 2 perfis dentro?).

## Ordem de execução

1. Confirmar este plano.
2. Executar Onda 1 inteira em uma sequência de edits.
3. Executar Onda 2.
4. Te chamar pra alinhar as perguntas da Onda 3 (modelo do "casal", login Google ou só email, etc.) antes de migrar.

## Detalhes técnicos relevantes

- Toggle de tema: classe `dark` no `<html>`, hook `useTheme` + `localStorage('theme')`, evita FOUC com script inline no `__root.tsx`.
- CSV export: gerado no client via `Blob` + `URL.createObjectURL` — zero dependência nova.
- CSV import: parsing manual (regex CSV simples) ou `papaparse` (~45kb). Vou usar `papaparse` pra lidar com vírgulas dentro de aspas.
- Edição de transação: se a tx faz parte de grupo (parcelamento) ou tem recorrência, o diálogo pergunta "editar só esta" ou "editar todas".
- Budget: cálculo do consumido reusa `monthlyStats().porCategoria` que já existe em `src/lib/finance.ts`.

Posso começar pela Onda 1?
