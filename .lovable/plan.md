# Plano: Implementação dos Módulos Elite (v4)

Esta atualização introduz funcionalidades avançadas de IA e comportamento financeiro ao FinançasDuo.

## 1. Estrutura de Rotas e Navegação
- Atualizar `src/components/Sidebar.tsx` para incluir os novos itens: "Patrimônio", "Comportamento", "Agente" e "Retrospectiva 2026" (sazonal).
- Criar novos arquivos de rota na pasta `src/routes/app/`:
    - `patrimonio.tsx`
    - `comportamento.tsx`
    - `agente.tsx`
    - `retrospectiva.tsx`

## 2. Implementação dos Módulos

### A. Módulo Comportamento (Gatilhos Emocionais)
- Nova tela `Comportamento` com Heatmap e cards de gatilhos (Leandro/Jonathan).
- Lógica de comparação cruzada de horários/gastos.

### B. Módulo Custo de Oportunidade
- Adicionar componente `CustoOportunidade` no formulário de lançamento (`transacoes.tsx`).
- Lógica de cálculo: `valor * ((1 + 0.10/12)^(meses) - 1) / (0.10/12)`.

### C. Módulo Agente Financeiro
- Nova tela `Agente` com feed de recomendações JSON mockadas (Dinheiro parado, Meta em risco, Assinaturas, Economia).

### D. Módulo Patrimônio
- Nova tela `Patrimônio` com visão consolidada (Ativos/Passivos), donut chart e projeção de crescimento líquido.

### E. Briefing Diário
- Novo componente `DailyBriefing` no `Dashboard.tsx` (cache 24h, mockado).

### F. Scan OCR (Simulação)
- Adicionar botão de upload de nota fiscal na tela de transações (exibir loading skeleton e preencher formulário mockado).

## 3. Dados e Contexto
- Atualizar `src/lib/mockData.ts` para incluir novos estados de patrimônio, eventos de vida e dados de gatilhos emocionais.

## 4. Design & UX
- Manter o design system existente (purple/emerald/orange).
- Usar cards shadcn/ui.
- Implementar transições suaves e estados de carregamento.
