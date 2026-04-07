import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Target, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function Savings() {
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["savings"],
    queryFn: () => api("/savings"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/savings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Goal deleted");
    },
  });

  const goals = data?.goals || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-muted-foreground">{goals.length} active goals</p>
        </div>
        <Button onClick={() => { setEditGoal(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> New Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No savings goals yet. Set a goal to start tracking your progress!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal: any) => {
            const current = parseFloat(goal.current_amount);
            const target = parseFloat(goal.target_amount);
            const pct = target > 0 ? (current / target) * 100 : 0;
            const remaining = target - current;
            const daysLeft = Math.max(0, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000));
            const monthlyNeeded = daysLeft > 0 ? remaining / (daysLeft / 30) : 0;

            return (
              <Card key={goal.id} className={goal.completed ? "border-green-500/30" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{goal.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(goal.target_date).toLocaleDateString()} ({daysLeft} days left)
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditGoal(goal); setShowForm(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(goal.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{formatCurrency(current)}</span>
                      <span className="text-muted-foreground">{formatCurrency(target)}</span>
                    </div>
                    <Progress value={Math.min(pct, 100)} indicatorClassName={pct >= 100 ? "bg-green-500" : "bg-primary"} />
                    <div className="flex justify-between">
                      <Badge variant={pct >= 100 ? "success" : "secondary"}>{Math.round(pct)}% complete</Badge>
                      {pct < 100 && daysLeft > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ~{formatCurrency(monthlyNeeded)}/mo needed
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalForm open={showForm} onClose={() => { setShowForm(false); setEditGoal(null); }} goal={editGoal} />
    </div>
  );
}

function GoalForm({ open, onClose, goal }: { open: boolean; onClose: () => void; goal: any }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: goal?.name || "",
    targetAmount: goal ? parseFloat(goal.target_amount).toString() : "",
    currentAmount: goal ? parseFloat(goal.current_amount).toString() : "0",
    targetDate: goal ? new Date(goal.target_date).toISOString().split("T")[0] : "",
  });

  useEffect(() => {
    setForm({
      name: goal?.name || "",
      targetAmount: goal ? parseFloat(goal.target_amount).toString() : "",
      currentAmount: goal ? parseFloat(goal.current_amount).toString() : "0",
      targetDate: goal ? new Date(goal.target_date).toISOString().split("T")[0] : "",
    });
  }, [goal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount),
        targetDate: form.targetDate,
      };
      if (goal) {
        await api(`/savings/${goal.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Goal updated");
      } else {
        await api("/savings", { method: "POST", body: JSON.stringify(body) });
        toast.success("Goal created");
      }
      queryClient.invalidateQueries({ queryKey: ["savings"] });
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
        <DialogHeader><DialogTitle>{goal ? "Edit Goal" : "New Savings Goal"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Goal Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Emergency Fund" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Amount</label>
              <Input type="number" step="0.01" min="0" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Amount</label>
              <Input type="number" step="0.01" min="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Date</label>
            <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {goal ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
