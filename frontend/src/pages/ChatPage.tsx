import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, User, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  "What can I make with what's in my pantry?",
  "Suggest a quick weeknight dinner",
  "What's a good meal prep strategy for this week?",
  "Give me a simple recipe for chicken and rice",
];

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: "Request failed" }));
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: err.detail || "Something went wrong." },
        ]);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data:"));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.error) {
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: `Error: ${data.error}` },
              ]);
              setIsLoading(false);
              return;
            }
            if (data.chunk) {
              accumulated += data.chunk;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: accumulated, streaming: true },
              ]);
            }
            if (data.done) {
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: accumulated },
              ]);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-1px)]">
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask about recipes, meal planning, or cooking</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            New chat
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-medium">What can I help you with?</p>
              <p className="text-sm text-muted-foreground mt-1">
                I know your recipe library, pantry, and family preferences.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border hover:bg-secondary/70 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary rounded-tl-sm"
                )}
              >
                {msg.content ? (
                  <MessageContent content={msg.content} />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                )}
                {msg.streaming && msg.content && (
                  <span className="inline-block w-0.5 h-3.5 bg-current opacity-70 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t flex-shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            placeholder="Ask about recipes, pantry, meal ideas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none min-h-[42px] max-h-32 flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[42px] w-[42px] flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1 whitespace-pre-wrap leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <p key={i} className="pl-2">{line}</p>;
        }
        return <span key={i}>{line}{i < lines.length - 1 ? "\n" : ""}</span>;
      })}
    </div>
  );
}
