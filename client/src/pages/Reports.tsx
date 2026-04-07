import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["report", month, year],
    queryFn: () => api(`/ai/report?month=${month}&year=${year}`),
    enabled: false,
  });

  const handleGenerate = () => {
    refetch();
  };

  const report = data?.report;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">AI-generated monthly financial analysis</p>
        </div>
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
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Generate Report
        </Button>
      </div>

      {report ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report for {MONTHS[month - 1]} {year}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => {
                const blob = new Blob([report.content], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `budget-report-${year}-${String(month).padStart(2, "0")}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              {report.content.split("\n").map((line: string, i: number) => {
                if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-4 mb-2 text-primary">{line.slice(3)}</h2>;
                if (line.startsWith("- **")) {
                  const parts = line.slice(2).split(":**");
                  return (
                    <div key={i} className="flex gap-2 py-1">
                      <span className="font-semibold">{parts[0].replace(/\*\*/g, "")}:</span>
                      <span className="text-muted-foreground">{parts[1]?.replace(/\*\*/g, "")}</span>
                    </div>
                  );
                }
                if (line.startsWith("- ")) return <p key={i} className="text-sm text-muted-foreground pl-4 py-0.5">&bull; {line.slice(2)}</p>;
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
              })}
            </div>
          </CardContent>
        </Card>
      ) : !isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Select a month and click "Generate Report" to create your financial analysis.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
