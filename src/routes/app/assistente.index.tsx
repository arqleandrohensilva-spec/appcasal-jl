import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread } from "@/lib/chat.functions";

export const Route = createFileRoute("/app/assistente/")({
  ssr: false,
  component: AssistenteIndex,
});

function AssistenteIndex() {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);

  useEffect(() => {
    (async () => {
      const threads = await list();
      if (threads.length > 0) {
        navigate({ to: "/app/assistente/$threadId", params: { threadId: threads[0].id }, replace: true });
      } else {
        const t = await create({ data: {} });
        navigate({ to: "/app/assistente/$threadId", params: { threadId: t.id }, replace: true });
      }
    })();
  }, [list, create, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
