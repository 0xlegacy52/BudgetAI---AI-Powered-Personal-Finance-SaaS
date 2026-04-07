import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Search, Trash2, Edit, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", search, filterType],
    queryFn: () =>
      api(`/transactions?limit=100${search ? `&search=${search}` : ""}${filterType !== "all" ? `&type=${filterType}` : ""}`),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api("/categories"),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api("/accounts"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transaction deleted");
    },
  });

  const transactions = data?.transactions || [];
  const categories = categoriesData?.categories || [];
  const accounts = accountsData?.accounts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">{data?.total || 0} total transactions</p>
        </div>
        <Button onClick={() => { setEditTx(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No transactions found. Add your first transaction to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tx.type === "income" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {tx.type === "income" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                        {tx.category_name && (
                          <Badge variant="secondary" className="text-xs">
                            {tx.category_name}
                          </Badge>
                        )}
                        {tx.account_name && (
                          <span className="text-xs text-muted-foreground">{tx.account_name}</span>
                        )}
                        {tx.is_recurring && <Badge variant="outline" className="text-xs">Recurring</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(parseFloat(tx.amount)))}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => { setEditTx(tx); setShowForm(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(tx.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditTx(null); }}
        transaction={editTx}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}

function TransactionForm({
  open,
  onClose,
  transaction,
  categories,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  transaction: any;
  categories: any[];
  accounts: any[];
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "expense" as string,
    categoryId: "",
    accountId: "",
    notes: "",
    isRecurring: false,
  });

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description,
        amount: Math.abs(parseFloat(transaction.amount)).toString(),
        date: new Date(transaction.date).toISOString().split("T")[0],
        type: transaction.type,
        categoryId: transaction.category_id?.toString() || "",
        accountId: transaction.account_id?.toString() || "",
        notes: transaction.notes || "",
        isRecurring: transaction.is_recurring || false,
      });
    } else {
      setForm({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        type: "expense",
        categoryId: "",
        accountId: "",
        notes: "",
        isRecurring: false,
      });
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        type: form.type,
        categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
        accountId: form.accountId ? parseInt(form.accountId) : undefined,
        notes: form.notes || undefined,
        isRecurring: form.isRecurring,
      };

      if (transaction) {
        await api(`/transactions/${transaction.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Transaction updated");
      } else {
        await api("/transactions", { method: "POST", body: JSON.stringify(body) });
        toast.success("Transaction added");
      }

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
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
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {accounts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Account</label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="rounded" />
            <label htmlFor="recurring" className="text-sm">Recurring transaction</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {transaction ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
