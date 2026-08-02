"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { totalDaysOutsideUS, longestTripDays, assessContinuousResidenceRisk } from "@/lib/eligibility";
import { strings } from "@/lib/i18n";
import type { WizardData, Trip } from "@/components/eligibility/eligibility-wizard";

export function TravelStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: WizardData;
  onUpdate: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [invalidIndexes, setInvalidIndexes] = useState<Set<number>>(new Set());

  // Live, running totals — calls the exact same pure functions the
  // server uses for the final calculation, not a separate approximation
  // kept in sync by hand.
  const validTrips = useMemo(
    () => data.trips.filter((t) => t.departDate && t.returnDate && t.returnDate >= t.departDate),
    [data.trips]
  );
  const totalDays = useMemo(() => totalDaysOutsideUS(validTrips), [validTrips]);
  const longest = useMemo(() => longestTripDays(validTrips), [validTrips]);
  const risk = useMemo(() => assessContinuousResidenceRisk(validTrips).risk, [validTrips]);

  function addTrip() {
    onUpdate({ trips: [...data.trips, { departDate: "", returnDate: "" }] });
  }

  function updateTrip(index: number, patch: Partial<Trip>) {
    const next = data.trips.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onUpdate({ trips: next });
    const trip = next[index]!;
    setInvalidIndexes((prev) => {
      const copy = new Set(prev);
      if (trip.departDate && trip.returnDate && trip.returnDate < trip.departDate) copy.add(index);
      else copy.delete(index);
      return copy;
    });
  }

  function removeTrip(index: number) {
    onUpdate({ trips: data.trips.filter((_, i) => i !== index) });
    setInvalidIndexes((prev) => {
      const copy = new Set(prev);
      copy.delete(index);
      return copy;
    });
  }

  const canContinue = invalidIndexes.size === 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">{strings.eligibility.travel.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{strings.eligibility.travel.subtitle}</p>
      </div>

      {data.trips.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {strings.eligibility.travel.noTripsYet}
        </p>
      ) : (
        <div className="space-y-3">
          {data.trips.map((trip, i) => {
            const days =
              trip.departDate && trip.returnDate && trip.returnDate >= trip.departDate
                ? totalDaysOutsideUS([trip])
                : null;
            return (
              <Card key={i}>
                <CardContent className="space-y-3 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground" htmlFor={`depart-${i}`}>
                        {strings.eligibility.travel.departDateLabel}
                      </label>
                      <Input
                        id={`depart-${i}`}
                        type="date"
                        value={trip.departDate}
                        onChange={(e) => updateTrip(i, { departDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground" htmlFor={`return-${i}`}>
                        {strings.eligibility.travel.returnDateLabel}
                      </label>
                      <Input
                        id={`return-${i}`}
                        type="date"
                        value={trip.returnDate}
                        onChange={(e) => updateTrip(i, { returnDate: e.target.value })}
                        error={invalidIndexes.has(i)}
                      />
                    </div>
                  </div>
                  {invalidIndexes.has(i) && (
                    <p className="text-xs text-destructive" role="alert">
                      {strings.eligibility.travel.invalidDates}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {days !== null && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {strings.eligibility.travel.tripDaysLabel(days)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTrip(i)}
                      aria-label={strings.eligibility.travel.removeTrip}
                      className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {strings.eligibility.travel.removeTrip}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addTrip}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-3 text-sm font-semibold text-primary hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {strings.eligibility.travel.addTrip}
      </button>

      {validTrips.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {strings.eligibility.travel.summaryTitle}
            </p>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">{strings.eligibility.travel.totalDaysOutside}</p>
                <p className="font-heading text-lg font-bold text-foreground">{totalDays}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{strings.eligibility.travel.longestTrip}</p>
                <p className="font-heading text-lg font-bold text-foreground">{longest}</p>
              </div>
            </div>
            {risk !== "none" && (
              <div className="flex items-start gap-2 rounded-xl bg-accent/10 p-3 text-sm text-accent-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {risk === "review" ? strings.eligibility.travel.riskReview : strings.eligibility.travel.riskLikelyBroken}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          {strings.eligibility.nav.back}
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={!canContinue}>
          {strings.eligibility.nav.next}
        </Button>
      </div>
    </div>
  );
}
