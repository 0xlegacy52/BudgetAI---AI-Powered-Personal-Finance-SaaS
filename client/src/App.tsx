import { Route, Switch, useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Accounts from "@/pages/Accounts";
import Budgets from "@/pages/Budgets";
import Savings from "@/pages/Savings";
import AiChat from "@/pages/AiChat";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import { Loader2 } from "lucide-react";

export default function App() {
  const { user, loading, login, register, logout, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading BudgetAI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register">
          <Register onRegister={register} />
        </Route>
        <Route path="/login">
          <Login onLogin={login} />
        </Route>
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={logout} userName={user?.name} />
      <main className="flex-1 ml-64 p-8">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/budgets" component={Budgets} />
          <Route path="/savings" component={Savings} />
          <Route path="/ai-chat" component={AiChat} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </main>
    </div>
  );
}
