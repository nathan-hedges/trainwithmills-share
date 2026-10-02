"use client";

import { useEffect, useState } from "react";
import { Check, Drumstick } from "lucide-react";
import { Card } from "@/components/portal/primitives";
import { Button } from "@/components/ui/Button";
import { proteinGoal } from "@/lib/nutrition/config";
import type { NutritionOverviewRow, NutritionProfileDTO } from "@/lib/nutrition/types";

const field =
  "h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal-500/15";

export function ProteinTool() {
  const [clients, setClients] = useState<NutritionOverviewRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [weightKg, setWeightKg] = useState(64);
  const [multiplier, setMultiplier] = useState(1.6);
  const [assigned, setAssigned] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load the client list for the dropdown.
  useEffect(() => {
    fetch("/api/nutrition/overview")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: NutritionOverviewRow[]) => {
        setClients(data);
        if (data[0]) setClientId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // Prefill weight/multiplier from the selected client's current goals.
  useEffect(() => {
    if (!clientId) return;
    setAssigned(false);
    fetch(`/api/clients/${clientId}/nutrition`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { profile: NutritionProfileDTO } | null) => {
        if (!d) return;
        setWeightKg(d.profile.bodyWeightKg ?? 64);
        setMultiplier(d.profile.proteinMultiplier);
      })
      .catch(() => {});
  }, [clientId]);

  const goal = proteinGoal(weightKg, multiplier);
  const client = clients.find((c) => c.id === clientId);

  async function assign() {
    if (!clientId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/nutrition/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyWeightKg: weightKg, proteinMultiplier: multiplier }),
      });
      if (res.ok) setAssigned(true);
    } finally {
      setSaving(false);
    }
  }

  if (clients.length === 0) {
    return <Card className="p-8 text-center text-muted">No clients to assign goals to yet.</Card>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={field}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.tier}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Bodyweight (kg)
            <input
              type="number"
              min={30}
              value={weightKg}
              onChange={(e) => { setWeightKg(Math.max(30, Number(e.target.value) || 0)); setAssigned(false); }}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Multiplier (g/kg)
            <input
              type="number"
              min={1}
              max={3}
              step={0.1}
              value={multiplier}
              onChange={(e) => { setMultiplier(Math.max(0.5, Number(e.target.value) || 0)); setAssigned(false); }}
              className={field}
            />
          </label>
        </div>
        <p className="text-xs text-muted">
          A higher multiplier suits more active or muscle-building clients (typically 1.2–2.2 g/kg).
        </p>
      </Card>

      <Card className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-royal-50 text-royal-600">
          <Drumstick className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted">Daily protein goal for {client?.name}</p>
        <div className="font-display text-5xl text-royal-700">{goal}g</div>
        <p className="text-sm text-muted">{weightKg} kg × {multiplier} g/kg</p>
        <div className="mt-3">
          {assigned ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" /> Assigned to {client?.name}
            </span>
          ) : (
            <Button onClick={assign} disabled={saving}>{saving ? "Assigning…" : "Assign goal"}</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
