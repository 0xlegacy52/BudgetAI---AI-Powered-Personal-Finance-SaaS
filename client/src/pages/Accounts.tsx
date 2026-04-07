import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Edit, Wallet, CreditCard, PiggyBank, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ACCOUNT_ICONS: Record<string, any> = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
  manual: Wallet,
};

export default function Accounts() {
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api("/accounts"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Account deleted");
    },
  });

  const accounts = data?.accounts || [];
  const totalBalance = accounts.reduce((sum: number, a: any) => sum + parseFloat(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Total balance: {formatCurrency(totalBalance)}</p>
        </div>
        <Button onClick={() => { setEditAccount(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No accounts yet. Add your first account to start tracking.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account: any) => {
            const Icon = ACCOUNT_ICONS[account.type] || Wallet;
            const balance = parseFloat(account.balance);
            return (
              <Card key={account.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        <Badge variant="secondary" className="mt-1 capitalize">
                          {account.type.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditAccount(account); setShowForm(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(account.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatCurrency(balance)}
                    </p>
                    {account.institution && (
                      <p className="text-xs text-muted-foreground mt-1">{account.institution}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AccountForm open={showForm} onClose={() => { setShowForm(false); setEditAccount(null); }} account={editAccount} />
    </div>
  );
}

function AccountForm({ open, onClose, account }: { open: boolean; onClose: () => void; account: any }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: account?.name || "",
    type: account?.type || "checking",
    balance: account ? parseFloat(account.balance).toString() : "0",
    institution: account?.institution || "",
  });

  useEffect(() => {
    setForm({
      name: account?.name || "",
      type: account?.type || "checking",
      balance: account ? parseFloat(account.balance).toString() : "0",
      institution: account?.institution || "",
    });
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = { name: form.name, type: form.type, balance: parseFloat(form.balance), institution: form.institution || undefined };
      if (account) {
        await api(`/accounts/${account.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Account updated");
      } else {
        await api("/accounts", { method: "POST", body: JSON.stringify(body) });
        toast.success("Account created");
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{account ? "Edit Account" : "Add Account"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Account Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Checking" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Balance</label>
              <Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Institution</label>
            <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. Chase Bank" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {account ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
