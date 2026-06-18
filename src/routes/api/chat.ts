import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Body = { messages?: UIMessage[]; threadId?: string };

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function buildFinancialContext(
  supabase: ReturnType<typeof createClient<Database>>,
  workspaceId: string,
  userId: string,
) {
  const now = new Date();
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);
  const ymCurrent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [profilesRes, txRes, budgetsRes, goalsRes, accountsRes, cardsRes, contribRes, myProfileRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, pessoa, email").eq("active_workspace_id", workspaceId),
    supabase.from("transactions")
      .select("date, amount, type, category, description, pessoa, installment_current, installment_total")
      .eq("workspace_id", workspaceId)
      .gte("date", threeMonthsAgo.toISOString().slice(0, 10))
      .order("date", { ascending: false }).limit(500),
    supabase.from("budgets").select("category, monthly_limit, owner").eq("workspace_id", workspaceId),
    supabase.from("goals").select("id, name, target, deadline, owner").eq("workspace_id", workspaceId),
    supabase.from("accounts").select("name, type, balance, owner").eq("workspace_id", workspaceId),
    supabase.from("cards").select("name, card_limit, due_day, closing_day, owner").eq("workspace_id", workspaceId),
    supabase.from("goal_contributions").select("goal_id, amount").eq("workspace_id", workspaceId),
    supabase.from("profiles").select("display_name, pessoa, email").eq("id", userId).single(),
  ]);

  const me = myProfileRes.data;
  const meName = me?.display_name || me?.email || "Usuário";
  const mePessoa = me?.pessoa ?? "casal";

  const tx = txRes.data ?? [];
  const monthTx = tx.filter(t => t.date?.startsWith(ymCurrent));
  const totalIn = monthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalOut = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const byCategory: Record<string, number> = {};
  monthTx.filter(t => t.type === "expense").forEach(t => {
    byCategory[t.category || "Outros"] = (byCategory[t.category || "Outros"] || 0) + Number(t.amount || 0);
  });
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const parcelas = tx.filter(t => (t.installment_total ?? 0) > 1).slice(0, 20);
  const accountsBalance = (accountsRes.data ?? []).reduce((s, a) => s + Number(a.balance || 0), 0);

  // soma contribuições por meta
  const contribByGoal: Record<string, number> = {};
  (contribRes.data ?? []).forEach(c => {
    contribByGoal[c.goal_id] = (contribByGoal[c.goal_id] || 0) + Number(c.amount || 0);
  });

  const lines: string[] = [];
  lines.push(`# Contexto Financeiro do Workspace`);
  lines.push(`**Usuário perguntando:** ${meName} (pessoa: ${mePessoa})`);
  lines.push(`**Data de hoje:** ${now.toISOString().slice(0, 10)}`);
  lines.push(`**Membros do workspace:** ${(profilesRes.data ?? []).map(p => `${p.display_name} (${p.pessoa ?? "?"})`).join(", ")}`);
  lines.push("");
  lines.push(`## Resumo do mês atual (${ymCurrent})`);
  lines.push(`- Receitas: ${fmtBRL(totalIn)}`);
  lines.push(`- Despesas: ${fmtBRL(totalOut)}`);
  lines.push(`- Saldo do mês: ${fmtBRL(totalIn - totalOut)}`);
  lines.push(`- Saldo total nas contas: ${fmtBRL(accountsBalance)}`);
  lines.push("");
  lines.push(`## Gastos por categoria (mês atual)`);
  topCategories.forEach(([c, v]) => lines.push(`- ${c}: ${fmtBRL(v)}`));
  lines.push("");
  lines.push(`## Contas`);
  (accountsRes.data ?? []).forEach(a =>
    lines.push(`- ${a.name} (${a.type}, ${a.owner ?? "casal"}): ${fmtBRL(Number(a.balance))}`));
  lines.push("");
  lines.push(`## Cartões de crédito`);
  (cardsRes.data ?? []).forEach(c =>
    lines.push(`- ${c.name} (${c.owner ?? "casal"}): limite ${fmtBRL(Number(c.card_limit))} — vence dia ${c.due_day}, fecha dia ${c.closing_day}`));
  lines.push("");
  lines.push(`## Orçamentos (limite mensal por categoria)`);
  (budgetsRes.data ?? []).forEach(b => {
    const spent = byCategory[b.category] || 0;
    const pct = b.monthly_limit ? Math.round((spent / Number(b.monthly_limit)) * 100) : 0;
    lines.push(`- ${b.category} (${b.owner ?? "casal"}): gasto este mês ${fmtBRL(spent)} de ${fmtBRL(Number(b.monthly_limit))} (${pct}%)`);
  });
  lines.push("");
  lines.push(`## Metas`);
  (goalsRes.data ?? []).forEach(g => {
    const current = contribByGoal[g.id] || 0;
    const pct = g.target ? Math.round((current / Number(g.target)) * 100) : 0;
    lines.push(`- ${g.name} (${g.owner ?? "casal"}): ${fmtBRL(current)} / ${fmtBRL(Number(g.target))} (${pct}%) — prazo ${g.deadline ?? "sem prazo"}`);
  });
  lines.push("");
  lines.push(`## Parcelas em aberto (próximas)`);
  parcelas.forEach(p =>
    lines.push(`- ${p.description} (${p.pessoa ?? "casal"}): ${fmtBRL(Number(p.amount))} — parcela ${p.installment_current}/${p.installment_total} — ${p.date}`));

  return { context: lines.join("\n"), meName, mePessoa };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const { messages, threadId } = body;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("messages e threadId são obrigatórios", { status: 400 });
        }
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = auth.slice(7);

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const { data: thread, error: thrErr } = await supabase
          .from("chat_threads").select("id, workspace_id, user_id, title").eq("id", threadId).single();
        if (thrErr || !thread || thread.user_id !== userId) {
          return new Response("Conversa não encontrada", { status: 404 });
        }

        const { context: financialContext, meName, mePessoa } =
          await buildFinancialContext(supabase, thread.workspace_id, userId);

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("anthropic/claude-sonnet-4.5");

        const systemPrompt = `Você é o "Assistente Financeiro" do app FinançasDuo — uma ferramenta de finanças compartilhadas entre Leandro e Jonathan (casal).

Responda em português brasileiro, de forma direta, calorosa e personalizada para ${meName} (pessoa: ${mePessoa}).
Use os dados reais abaixo. Quando responder, deixe claro se a análise é pessoal (de ${meName}) ou conjunta (do casal).
Use formatação Markdown leve (negritos, listas curtas). Cite valores em reais (R$). Nunca invente dados que não estejam no contexto.
Se a pergunta exigir um dado que não está no contexto, diga e sugira em qual seção do app o usuário pode adicionar.

${financialContext}`;

        const userMsg = messages[messages.length - 1];
        const userText = userMsg?.parts?.map(p => (p.type === "text" ? p.text : "")).join("") || "";

        // Salva mensagem do usuário antes de responder
        if (userMsg?.role === "user" && userText) {
          await supabase.from("chat_messages").insert({
            thread_id: threadId,
            workspace_id: thread.workspace_id,
            user_id: userId,
            role: "user",
            content: userText,
            parts: userMsg.parts as unknown as never,
          });
          // Renomeia a thread com a primeira mensagem se ainda for "Nova conversa"
          if (thread.title === "Nova conversa") {
            const title = userText.slice(0, 60);
            await supabase.from("chat_threads").update({ title }).eq("id", threadId);
          }
        }

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            const last = finalMessages[finalMessages.length - 1];
            if (last?.role === "assistant") {
              const text = last.parts.map(p => (p.type === "text" ? p.text : "")).join("");
              await supabase.from("chat_messages").insert({
                thread_id: threadId,
                workspace_id: thread.workspace_id,
                user_id: userId,
                role: "assistant",
                content: text,
                parts: last.parts as unknown as never,
              });
            }
          },
        });
      },
    },
  },
});
