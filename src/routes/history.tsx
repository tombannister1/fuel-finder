import { createFileRoute, Link } from "@tanstack/react-router";
import { PriceHistoryExample } from "@/components/price-history-example";
import { ArrowLeft, BarChart3, Fuel, Zap } from "lucide-react";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Back & Logo */}
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="w-9 h-9 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-foreground">Price History</h1>
                  <p className="text-xs text-muted-foreground">Track prices over time</p>
                </div>
              </div>
            </div>

            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full pulse-glow"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <PriceHistoryExample />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-auto safe-bottom">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Powered by UK Government Fuel Price API</span>
            </div>
            <div className="flex items-center gap-4">
              <span>6,700+ stations</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Updated regularly</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
