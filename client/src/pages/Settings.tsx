import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Monitor, Shield, Brain, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { data: sessionsData, refetch } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api("/auth/sessions"),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api("/accounts"),
  });

  const revokeSession = async (id: number) => {
    try {
      await api(`/auth/sessions/${id}`, { method: "DELETE" });
      refetch();
      toast.success("Session revoked");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const sessions = sessionsData?.sessions || [];
  const accounts = accountsData?.accounts || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions"><Shield className="h-4 w-4 mr-1" /> Sessions</TabsTrigger>
          <TabsTrigger value="accounts"><Wallet className="h-4 w-4 mr-1" /> Accounts</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="h-4 w-4 mr-1" /> AI</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your logged-in sessions across devices</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{session.device || "Unknown device"}</p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(session.created_at).toLocaleDateString()} &middot;
                            Expires: {new Date(session.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => revokeSession(session.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Your linked bank accounts and manual accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts connected. Go to the Accounts page to add one.</p>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account: any) => (
                    <div key={account.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="capitalize">{account.type.replace("_", " ")}</Badge>
                          {account.institution && <span className="text-xs text-muted-foreground">{account.institution}</span>}
                        </div>
                      </div>
                      <span className="font-semibold">${parseFloat(account.balance).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>Configure AI-powered features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">AI Assistant</p>
                    <p className="text-sm text-muted-foreground">
                      Uses your financial data to provide personalized insights and advice.
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Monthly Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically generated monthly financial analysis and recommendations.
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-accent/50">
                <p className="font-medium">OpenAI Integration</p>
                <p className="text-sm text-muted-foreground mt-1">
                  For enhanced AI responses, add your OpenAI API key as an environment variable (OPENAI_API_KEY).
                  Without it, the AI assistant uses built-in analytics based on your data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
