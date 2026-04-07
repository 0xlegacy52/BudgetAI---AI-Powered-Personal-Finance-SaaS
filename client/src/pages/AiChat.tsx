import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Brain, Send, Trash2, Loader2, User, Bot } from "lucide-react";
import { toast } from "sonner";

export default function AiChat() {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["ai-history"],
    queryFn: () => api("/ai/history"),
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => api("/ai/chat", { method: "POST", body: JSON.stringify({ message: msg }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-history"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => api("/ai/history", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-history"] });
      toast.success("Chat history cleared");
    },
  });

  const messages = data?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || chatMutation.isPending) return;
    chatMutation.mutate(message);
    setMessage("");
  };

  const suggestions = [
    "How much did I spend on food this month?",
    "Am I on track with my budget?",
    "What's my biggest expense category?",
    "Tips to save more money",
    "Show me my financial summary",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ask AI</h1>
          <p className="text-muted-foreground">Get AI-powered insights about your finances</p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" onClick={() => clearMutation.mutate()}>
            <Trash2 className="h-4 w-4" /> Clear Chat
          </Button>
        )}
      </div>

      <Card className="flex flex-col h-[calc(100vh-220px)]">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !chatMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">BudgetAI Assistant</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Ask me anything about your finances. I can analyze your spending, track budgets, and give personalized advice.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setMessage(s); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg: any, i: number) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about your finances..."
              disabled={chatMutation.isPending}
              className="flex-1"
            />
            <Button type="submit" disabled={chatMutation.isPending || !message.trim()}>
              {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
