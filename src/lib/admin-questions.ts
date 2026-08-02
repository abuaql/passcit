import { prisma } from "@/lib/prisma";
import type { QuestionCategory } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export interface AdminQuestionFilters {
  search?: string;
  testVersionId?: string;
  category?: QuestionCategory;
  page?: number;
}

export async function listAdminQuestions(filters: AdminQuestionFilters) {
  const page = Math.max(1, filters.page ?? 1);

  const where = {
    testVersionId: filters.testVersionId,
    category: filters.category,
    question: filters.search ? { contains: filters.search } : undefined,
  };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: [{ testVersion: { year: "asc" } }, { number: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        category: true,
        subcategory: true,
        question: true,
        isActive: true,
        testVersion: { select: { id: true, name: true } },
        _count: { select: { answers: true } },
      },
    }),
    prisma.question.count({ where }),
  ]);

  return { questions, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdminQuestionById(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      testVersion: { select: { id: true, name: true, slug: true } },
      answers: { orderBy: { sortOrder: "asc" } },
      tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  });
}

export interface QuestionInput {
  testVersionId: string;
  number: number;
  category: QuestionCategory;
  subcategory: string;
  question: string;
  explanation?: string | null;
  answers: string[];
  requiredAnswerCount?: number;
  isSpecial65_20?: boolean;
  isDynamicAnswer?: boolean;
  dynamicNote?: string | null;
  variesByLocation?: boolean;
  isActive?: boolean;
}

export async function createAdminQuestion(input: QuestionInput) {
  return prisma.question.create({
    data: {
      testVersionId: input.testVersionId,
      number: input.number,
      category: input.category,
      subcategory: input.subcategory,
      question: input.question,
      explanation: input.explanation ?? null,
      requiredAnswerCount: input.requiredAnswerCount ?? 1,
      isSpecial65_20: input.isSpecial65_20 ?? false,
      isDynamicAnswer: input.isDynamicAnswer ?? false,
      dynamicNote: input.dynamicNote ?? null,
      variesByLocation: input.variesByLocation ?? false,
      isActive: input.isActive ?? true,
      answers: {
        create: input.answers
          .filter((a) => a.trim().length > 0)
          .map((text, i) => ({ text: text.trim(), sortOrder: i })),
      },
    },
  });
}

export async function updateAdminQuestion(id: string, input: QuestionInput) {
  // Replace answers wholesale rather than diffing — simplest way to keep
  // this correct given the admin form always submits the full answer list.
  return prisma.$transaction(async (tx) => {
    await tx.questionAnswer.deleteMany({ where: { questionId: id } });
    return tx.question.update({
      where: { id },
      data: {
        testVersionId: input.testVersionId,
        number: input.number,
        category: input.category,
        subcategory: input.subcategory,
        question: input.question,
        explanation: input.explanation ?? null,
        requiredAnswerCount: input.requiredAnswerCount ?? 1,
        isSpecial65_20: input.isSpecial65_20 ?? false,
        isDynamicAnswer: input.isDynamicAnswer ?? false,
        dynamicNote: input.dynamicNote ?? null,
        variesByLocation: input.variesByLocation ?? false,
        isActive: input.isActive ?? true,
        answers: {
          create: input.answers
            .filter((a) => a.trim().length > 0)
            .map((text, i) => ({ text: text.trim(), sortOrder: i })),
        },
      },
    });
  });
}

export async function deleteAdminQuestion(id: string) {
  // Cascades to QuestionAnswer/QuestionTag/UserQuestionProgress/etc. per
  // the onDelete: Cascade relations already defined in schema.prisma —
  // no new logic needed here beyond the delete itself.
  return prisma.question.delete({ where: { id } });
}

export async function duplicateAdminQuestion(id: string) {
  const original = await prisma.question.findUnique({
    where: { id },
    include: { answers: { orderBy: { sortOrder: "asc" } } },
  });
  if (!original) return null;

  // The new copy needs a number that doesn't collide with the version's
  // existing numbering (number is unique per test version) — placed just
  // past the highest existing number in that version.
  const highest = await prisma.question.findFirst({
    where: { testVersionId: original.testVersionId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = (highest?.number ?? 0) + 1;

  return prisma.question.create({
    data: {
      testVersionId: original.testVersionId,
      number: nextNumber,
      category: original.category,
      subcategory: original.subcategory,
      question: `${original.question} (copy)`,
      explanation: original.explanation,
      requiredAnswerCount: original.requiredAnswerCount,
      isSpecial65_20: false, // a duplicate shouldn't silently join the senior exception list
      isDynamicAnswer: original.isDynamicAnswer,
      dynamicNote: original.dynamicNote,
      variesByLocation: original.variesByLocation,
      isActive: false, // duplicates start inactive so they don't appear to students until reviewed
      answers: {
        create: original.answers.map((a) => ({ text: a.text, sortOrder: a.sortOrder })),
      },
    },
  });
}
