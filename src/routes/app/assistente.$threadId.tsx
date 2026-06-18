import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listThreads, createThread, deleteThread, getThreadMessages,
} from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Sparkles, Send, Plus, Trash2, Loader2, MessageSquare, User, Bot, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/assistente/$threadId")({
  ssr: false,
  component: AssistentePage,
});

const QUICK_PROMPTS = [
  "Posso gastar R$ 300 hoje?",
  "Quanto falta para minhas metas?",
  "Como estão minhas faturas?",
  "Onde posso economizar esse mês?",
];

function AssistentePage() {
  const { threadId } = useParams({ from: "/app/assistente/$threadId" });
  const navigate = useNavigate();

  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);
  const getMsgs = useServerFn(getThreadMessages);

  const [threads, setThreads] = useState<Awaited<ReturnType<typeof list>>>([]);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => { list().then(setThreads); }, [list]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  useEffect(() => {
    setInitial(null);
    getMsgs({ data: { threadId } }).then(rows => {
      const conv: UIMessage[] = rows.map(r => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: (r.parts as UIMessage["parts"]) ?? [{ type: "text", text: r.content }],
      }));
      setInitial(conv);
    }).catch(() => setInitial([]));
  }, [threadId, getMsgs]);

  if (!token || initial === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      token={token}
      initialMessages={initial}
      threads={threads}
      refreshThreads={async () => setThreads(await list())}
      onNewThread={async () => {
        const t = await create({ data: {} });
        setThreads(await list());
        navigate({ to: "/app/assistente/$threadId", params: { threadId: t.id } });
      }}
      onDeleteThread={async (id) => {
        await del({ data: { threadId: id } });
        const fresh = await list();
        setThreads(fresh);
        if (id === threadId) {
          if (fresh[0]) navigate({ to: "/app/assistente/$threadId", params: { threadId: fresh[0].id } });
          else navigate({ to: "/app/assistente" });
        }
      }}
    />
  );
}

function ChatWindow({
  threadId, token, initialMessages, threads, onNewThread, onDeleteThread, refreshThreads,
}: {
  threadId: string;
  token: string;
  initialMessages: UIMessage[];
  threads: { id: string; title: string; updated_at: string }[];
  onNewThread: () => Promise<void>;
  onDeleteThread: (id: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const transport = useRef(new DefaultChatTransport({
    api: "/api/chat",
    headers: { Authorization: `Bearer ${token}` },
    body: { threadId },
  }));

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: transport.current,
    onError: (e) => toast.error(e.message || "Erro ao conversar com o assistente"),
    onFinish: () => { refreshThreads(); },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => { taRef.current?.focus(); }, [threadId, status]);

  const busy = status === "submitted" || status === "streaming";

  const submit = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput("");
    await sendMessage({ text: text.trim() });
  };

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4 h-[calc(100vh-3rem)]">
      {/* Lista de threads */}
      <Card className="p-3 flex flex-col overflow-hidden">
        <Button onClick={onNewThread} className="w-full mb-3" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Nova conversa
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {threads.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">Nenhuma conversa ainda.</p>
          )}
          {threads.map(t => (
            <div key={t.id} className="group flex items-center">
              <Link
                to="/app/assistente/$threadId"
                params={{ threadId: t.id }}
                className={cn(
                  "flex-1 truncate text-sm px-2 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2",
                  t.id === threadId && "bg-muted font-medium",
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">{t.title}</span>
              </Link>
              <button
                onClick={() => {
                  if (confirm("Excluir esta conversa?")) onDeleteThread(t.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive"
                aria-label="Excluir conversa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Chat */}
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Assistente Financeiro</h2>
            <p className="text-xs text-muted-foreground">Análises personalizadas do seu workspace</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold">Olá! Como posso ajudar?</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Pergunte sobre suas finanças. Eu vejo suas transações, metas, orçamentos e cartões.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
                {QUICK_PROMPTS.map(q => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="text-left p-3 rounded-lg border hover:bg-muted text-sm transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts.map(p => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
                <div className={cn(
                  "h-8 w-8 rounded-full shrink-0 flex items-center justify-center",
                  isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-teal-500 to-emerald-500 text-white",
                )}>
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted",
                )}>
                  {text || <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            );
          })}

          {status === "submitted" && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Pensando...
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error.message}</p>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="border-t p-3 flex gap-2 items-end"
        >
          <Textarea
            ref={taRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); }
            }}
            placeholder="Pergunte algo sobre suas finanças..."
            className="resize-none min-h-[44px] max-h-[160px]"
            rows={1}
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
