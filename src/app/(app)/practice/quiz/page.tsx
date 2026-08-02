import type { Metadata } from "next";
import { PracticeQuizClient } from "@/components/practice/practice-quiz-client";

export const metadata: Metadata = { title: "Practice Mode" };

export default function PracticeQuizPage() {
  return <PracticeQuizClient />;
}
