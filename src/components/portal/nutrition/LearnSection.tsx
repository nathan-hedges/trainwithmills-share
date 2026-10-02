import { Bone, Fish, GraduationCap, HeartPulse, Pill, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/portal/primitives";
import { femaleHealth, proteinEducation, type Nutrient } from "@/lib/nutrition/content";

const NUTRIENT_STYLE: Record<Nutrient["icon"], { icon: LucideIcon; chip: string }> = {
  iron: { icon: Pill, chip: "bg-rose-50 text-rose-600" },
  calcium: { icon: Bone, chip: "bg-sky-50 text-sky-600" },
  vitd: { icon: Sun, chip: "bg-gold-100 text-gold-600" },
  omega3: { icon: Fish, chip: "bg-emerald-50 text-emerald-600" },
};

export function LearnSection() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="flex items-center gap-2 font-display text-xl">
          <GraduationCap className="h-5 w-5 text-royal-600" />
          Nutrition education
        </h2>
        <p className="mt-1 text-sm text-muted">The basics that make the biggest difference - start with protein.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {proteinEducation.map((a) => (
            <Card key={a.title} className="p-5">
              <h3 className="font-display text-base">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-xl">
          <HeartPulse className="h-5 w-5 text-rose-500" />
          Female health
        </h2>
        <p className="mt-1 text-sm text-muted">
          The nutrients that matter most for women in training - what they do and where to get them.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {femaleHealth.map((n) => {
            const style = NUTRIENT_STYLE[n.icon];
            const Icon = style.icon;
            return (
              <Card key={n.name} className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", style.chip)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-lg">{n.name}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink">{n.why}</p>
                <p className="mt-2 text-xs text-muted">
                  <span className="font-semibold text-ink">Good sources: </span>
                  {n.sources}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
