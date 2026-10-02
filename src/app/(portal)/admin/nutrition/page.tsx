"use client";

import { useState } from "react";
import { Calculator, LayoutDashboard, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/portal/primitives";
import { CoachDashboard } from "@/components/portal/nutrition/CoachDashboard";
import { MealManager } from "@/components/portal/nutrition/MealManager";
import { ProteinTool } from "@/components/portal/nutrition/ProteinTool";

const TABS = [
  { id: "overview", label: "Client overview", icon: LayoutDashboard },
  { id: "meals", label: "Meal database", icon: UtensilsCrossed },
  { id: "protein", label: "Protein tool", icon: Calculator },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function CoachNutritionPage() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      <PageHeading
        title="Nutrition"
        subtitle="Track every client's habits and protein compliance, and manage your meal database."
      />

      <div className="flex gap-1 rounded-full border border-line bg-white p-1 sm:w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-colors sm:flex-none",
                tab === t.id ? "bg-royal-600 text-white" : "text-muted hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <CoachDashboard />}
      {tab === "meals" && <MealManager />}
      {tab === "protein" && <ProteinTool />}
    </div>
  );
}
