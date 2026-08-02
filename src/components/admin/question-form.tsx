"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Eye, EyeOff, CheckCircle2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { CATEGORY_OPTIONS, CATEGORY_LABELS, CATEGORY_BADGE_VARIANT } from "@/lib/categories";
import { strings } from "@/lib/i18n";
import type { QuestionCategory } from "@/generated/prisma/client";

export interface QuestionFormValues {
  testVersionId: string;
  number: number;
  category: QuestionCategory;
  subcategory: string;
  question: string;
  explanation: string;
  answers: string[];
  requiredAnswerCount: number;
  isSpecial65_20: boolean;
  isDynamicAnswer: boolean;
  dynamicNote: string;
  variesByLocation: boolean;
  isActive: boolean;
}

const EMPTY_VALUES = (defaultTestVersionId: string): QuestionFormValues => ({
  testVersionId: defaultTestVersionId,
  number: 1,
  category: "AMERICAN_GOVERNMENT",
  subcategory: "",
  question: "",
  explanation: "",
  answers: [""],
  requiredAnswerCount: 1,
  isSpecial65_20: false,
  isDynamicAnswer: false,
  dynamicNote: "",
  variesByLocation: false,
  isActive: true,
});

export function QuestionForm({
  testVersions,
  initialValues,
  questionId,
}: {
  testVersions: { id: string; name: string }[];
  initialValues?: QuestionFormValues;
  /** Present when editing; absent when creating. */
  questionId?: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<QuestionFormValues>(
    initialValues ?? EMPTY_VALUES(testVersions[0]?.id ?? "")
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof QuestionFormValues>(key: K, value: QuestionFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function updateAnswer(index: number, text: string) {
    setValues((v) => ({ ...v, answers: v.answers.map((a, i) => (i === index ? text : a)) }));
  }

  function addAnswer() {
    setValues((v) => ({ ...v, answers: [...v.answers, ""] }));
  }

  function removeAnswer(index: number) {
    setValues((v) => ({ ...v, answers: v.answers.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanAnswers = values.answers.map((a) => a.trim()).filter(Boolean);
    if (!values.variesByLocation && cleanAnswers.length === 0) {
      setError(strings.admin.questionForm.missingAnswer);
      return;
    }

    setIsSaving(true);
    const payload = { ...values, answers: cleanAnswers, explanation: values.explanation || null, dynamicNote: values.dynamicNote || null };

    try {
      const res = await fetch(questionId ? `/api/admin/questions/${questionId}` : "/api/admin/questions", {
        method: questionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? strings.admin.questionForm.saveFailed);
        setIsSaving(false);
        return;
      }
      show(questionId ? strings.admin.questionForm.updated : strings.admin.questionForm.created, "success");
      router.push("/admin/questions");
      router.refresh();
    } catch {
      setError(strings.admin.questionForm.saveFailedRetry);
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {questionId ? strings.admin.questionForm.editTitle : strings.admin.questionForm.newTitle}
        </h1>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((s) => !s)}>
          {showPreview ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          {showPreview ? strings.admin.questionForm.hidePreview : strings.admin.questionForm.preview}
        </Button>
      </div>

      {showPreview && <QuestionPreview values={values} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="testVersionId">{strings.admin.questionForm.testVersion}</Label>
              <select
                id="testVersionId"
                value={values.testVersionId}
                onChange={(e) => update("testVersionId", e.target.value)}
                required
                className="h-10 w-full rounded-2xl border-2 border-border bg-card px-3 text-sm"
              >
                {testVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">{strings.admin.questionForm.questionNumber}</Label>
              <Input
                id="number"
                type="number"
                min={1}
                value={values.number}
                onChange={(e) => update("number", Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{strings.admin.questionForm.category}</Label>
              <select
                id="category"
                value={values.category}
                onChange={(e) => update("category", e.target.value as QuestionCategory)}
                className="h-10 w-full rounded-2xl border-2 border-border bg-card px-3 text-sm"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">{strings.admin.questionForm.subcategory}</Label>
              <Input
                id="subcategory"
                value={values.subcategory}
                onChange={(e) => update("subcategory", e.target.value)}
                placeholder={strings.admin.questionForm.subcategoryPlaceholder}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="question">{strings.admin.questionForm.questionText}</Label>
              <textarea
                id="question"
                value={values.question}
                onChange={(e) => update("question", e.target.value)}
                required
                rows={2}
                className="w-full rounded-2xl border-2 border-border bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">{strings.admin.questionForm.explanationOptional}</Label>
              <textarea
                id="explanation"
                value={values.explanation}
                onChange={(e) => update("explanation", e.target.value)}
                rows={2}
                className="w-full rounded-2xl border-2 border-border bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredAnswerCount">{strings.admin.questionForm.howManyAnswers}</Label>
              <Input
                id="requiredAnswerCount"
                type="number"
                min={1}
                value={values.requiredAnswerCount}
                onChange={(e) => update("requiredAnswerCount", Number(e.target.value))}
                className="max-w-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        {!values.variesByLocation && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <Label>{strings.admin.questionForm.acceptedAnswers}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAnswer}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {strings.admin.questionForm.addAnswer}
                </Button>
              </div>
              {values.answers.map((answer, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={answer} onChange={(e) => updateAnswer(i, e.target.value)} placeholder={strings.admin.questionForm.answerPlaceholder(i + 1)} />
                  {values.answers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAnswer(i)}
                      aria-label={strings.admin.questionForm.removeAnswer}
                      className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-3 p-6">
            <CheckboxField
              label={strings.admin.questionForm.special6520Label}
              checked={values.isSpecial65_20}
              onChange={(v) => update("isSpecial65_20", v)}
            />
            <CheckboxField
              label={strings.admin.questionForm.dynamicAnswerLabel}
              checked={values.isDynamicAnswer}
              onChange={(v) => update("isDynamicAnswer", v)}
            />
            {values.isDynamicAnswer && (
              <Input
                value={values.dynamicNote}
                onChange={(e) => update("dynamicNote", e.target.value)}
                placeholder={strings.admin.questionForm.dynamicNotePlaceholder}
              />
            )}
            <CheckboxField
              label={strings.admin.questionForm.variesByLocationLabel}
              checked={values.variesByLocation}
              onChange={(v) => update("variesByLocation", v)}
            />
            <CheckboxField
              label={strings.admin.questionForm.activeLabel}
              checked={values.isActive}
              onChange={(v) => update("isActive", v)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/questions")}>
            {strings.admin.questionForm.cancel}
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {questionId ? strings.admin.questionForm.saveChanges : strings.admin.questionForm.createQuestion}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-2 border-border accent-primary"
      />
      {label}
    </label>
  );
}

function QuestionPreview({ values }: { values: QuestionFormValues }) {
  return (
    <Card className="border-primary">
      <CardContent className="space-y-4 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{strings.admin.questionForm.studentPreview}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={CATEGORY_BADGE_VARIANT[values.category]}>{CATEGORY_LABELS[values.category]}</Badge>
          <Badge variant="outline">{values.subcategory || strings.admin.questionForm.subcategoryPlaceholderPreview}</Badge>
          {values.isSpecial65_20 && <Badge variant="outline">{strings.admin.questionForm.special6520List}</Badge>}
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          {values.question || strings.admin.questionForm.questionTextPlaceholder}
        </h2>
        {values.variesByLocation ? (
          <div className="flex items-start gap-2 rounded-2xl bg-secondary/10 p-4 text-sm text-secondary">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {strings.admin.questionForm.variesByLocationPreview}
          </div>
        ) : (
          <ul className="space-y-2">
            {values.answers.filter(Boolean).map((a, i) => (
              <li key={i} className="flex items-center gap-2 rounded-2xl bg-primary/10 p-3 font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        )}
        {values.isDynamicAnswer && values.dynamicNote && (
          <div className="flex items-start gap-2 rounded-2xl bg-accent/15 p-3 text-sm text-accent-foreground dark:text-accent">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {values.dynamicNote}
          </div>
        )}
        {values.explanation && <p className="border-t-2 border-border pt-3 text-sm text-muted-foreground">{values.explanation}</p>}
      </CardContent>
    </Card>
  );
}
