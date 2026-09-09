import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { Bot, Loader2, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { ChatMessage } from "@/context/ScreeningHistoryContext";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "What is diabetic retinopathy?",
  "Explain the DR staging scale 0 to 4",
  "What does referable DR mean?",
  "How does the RetinaScan pipeline work?",
];

export default function Chat() {
  const sendChat = useAction(api.screening.chat);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  const submit = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);

    try {
      const res = await sendChat({ question: trimmed, history });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Could not reach the AI service. Please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit(input);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            RetinaScan AI
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            AI Chat Assistant
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ask about diabetic retinopathy, DR staging, or how the screening
            pipeline works. For questions about a specific result, use the
            follow-up chat on the New Screening page after running a case.
          </p>
        </header>

        <div className="nb-border flex min-h-[28rem] flex-col bg-card">
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-start gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center border-2 bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </span>
                  <p className="border-2 bg-muted px-3 py-2 text-sm">
                    Hi — I'm the RetinaScan AI assistant. Ask me anything about
                    diabetic retinopathy screening, or pick a question below to
                    get started.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submit(prompt)}
                      disabled={busy}
                      className="nb-pop-hover cursor-pointer border-2 bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3",
                  m.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center border-2",
                    m.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {m.role === "user" ? (
                    <User className="size-4" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                </span>
                <p
                  className={cn(
                    "max-w-[80%] border-2 px-3 py-2 text-sm leading-6",
                    m.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-card",
                  )}
                >
                  {m.content}
                </p>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t-2 bg-muted p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                busy ? "Waiting for a reply..." : "Ask a question..."
              }
              className="min-w-0 flex-1 border-2 bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              disabled={busy}
            />
            <Button
              type="submit"
              size="sm"
              disabled={busy || !input.trim()}
              className="cursor-pointer gap-1.5 rounded-none border-2 font-semibold"
            >
              <Send className="size-3.5" />
              Send
            </Button>
            {messages.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMessages([])}
                disabled={busy}
                className="cursor-pointer gap-1.5 rounded-none border-2 font-semibold"
                aria-label="Clear conversation"
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            )}
          </form>
        </div>
      </div>
    </AppShell>
  );
}
