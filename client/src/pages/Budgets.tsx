import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Budgets() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["budgets", month, year],
    queryFn: () => api(`/budgets?month=${month}&year=${year}`),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api("/categories"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Budget deleted");
    },
  });

  const budgets = data?.budgets || [];
  const categories = categoriesData?.categories || [];
  const totalBudget = budgets.reduce((s: number, b: any) => s + parseFloat(b.amount), 0);
  const totalSpent = budgets.reduce((s: number, b: any) => s + parseFloat(b.spent), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">
            {MONTHS[month - 1]} {year} &mdash; {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add Budget
          </Button>
        </div>
      </div>

      {totalBudget > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Budget</span>
              <span>{formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}</span>
            </div>
            <Progress
              value={totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}
              indicatorClassName={totalSpent > totalBudget ? "bg-red-500" : totalSpent > totalBudget * 0.75 ? "bg-yellow-500" : "bg-green-500"}
              className="h-3"
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No budgets set for {MONTHS[month - 1]}. Create your first budget to track spending.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget: any) => {
            const spent = parseFloat(budget.spent);
            const limit = parseFloat(budget.amount);
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            const over = spent > limit;
            const warning = pct >= 75 && !over;
            return (
              <Card key={budget.id} className={over ? "border-red-500/30" : warning ? "border-yellow-500/30" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: budget.category_color || "#6366f1" }} />
                      <span className="font-semibold">{budget.category_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {over && <AlertTriangle className="h-4 w-4 text-red-400" />}
                      {!over && pct < 75 && <CheckCircle className="h-4 w-4 text-green-400" />}
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(budget.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className={over ? "text-red-400 font-medium" : "text-muted-foreground"}>
                      {formatCurrency(spent)}
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(limit)}</span>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    indicatorClassName={over ? "bg-red-500" : warning ? "bg-yellow-500" : "bg-green-500"}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {over ? `Over budget by ${formatCurrency(spent - limit)}` : `${formatCurrency(limit - spent)} remaining`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetForm open={showForm} onClose={() => setShowForm(false)} categories={categories} month={month} year={year} />
    </div>
  );
}

function BudgetForm({ open, onClose, categories, month, year }: { open: boolean; onClose: () => void; categories: any[]; month: number; year: number }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/budgets", {
        method: "POST",
        body: JSON.stringify({ categoryId: parseInt(categoryId), amount: parseFloat(amount), month, year }),
      });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Budget created");
      onClose();
      setCategoryId("");
      setAmount("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Set Budget</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.filter((c: any) => c.name !== "Income" && c.name !== "Transfer").map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Limit</label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500.00" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !categoryId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Set Budget
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
