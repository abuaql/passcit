import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(req.url);
  const testVersionId = searchParams.get("testVersionId") ?? undefined;

  try {
    const questions = await prisma.question.findMany({
      where: { testVersionId },
      orderBy: [{ testVersionId: "asc" }, { number: "asc" }],
      include: { answers: { orderBy: { sortOrder: "asc" } } },
    });

    const exportData = questions.map((q) => ({
      testVersionId: q.testVersionId,
      number: q.number,
      category: q.category,
      subcategory: q.subcategory,
      question: q.question,
      explanation: q.explanation,
      answers: q.answers.map((a) => a.text),
      requiredAnswerCount: q.requiredAnswerCount,
      isSpecial65_20: q.isSpecial65_20,
      isDynamicAnswer: q.isDynamicAnswer,
      dynamicNote: q.dynamicNote,
      variesByLocation: q.variesByLocation,
      isActive: q.isActive,
    }));

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="passcit-questions-export.json"`,
      },
    });
  } catch (error) {
    logger.error("api.admin.questions.export", "Could not export questions", error);
    return NextResponse.json({ error: "Could not export questions." }, { status: 500 });
  }
}
