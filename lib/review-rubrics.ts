import type { questionType } from "@/db/schema";

type QuestionType = (typeof questionType.enumValues)[number];

export type ReviewCriterion = {
  key: string;
  label: string;
  description: string;
  maximum: number;
};

export function getReviewCriteria(
  type: QuestionType,
  section: string,
  maximumMarks: number,
): ReviewCriterion[] {
  if (type === "short_answer" && maximumMarks === 3) {
    return [
      { key: "accurate_idea", label: "Accurate idea", description: "Answers the question accurately.", maximum: 1 },
      { key: "passage_evidence", label: "Passage evidence", description: "Uses a relevant supporting detail.", maximum: 1 },
      { key: "complete_explanation", label: "Complete explanation", description: "Connects the evidence to the answer.", maximum: 1 },
    ];
  }

  if (type === "extended_writing" && maximumMarks === 6) {
    return [
      { key: "task_and_structure", label: "Task and structure", description: "Develops the prompt with a clear sequence.", maximum: 2 },
      { key: "language_and_effect", label: "Language and effect", description: "Uses purposeful vocabulary and detail.", maximum: 2 },
      { key: "accuracy_and_mechanics", label: "Accuracy and mechanics", description: "Controls grammar, spelling, and punctuation.", maximum: 2 },
    ];
  }

  return [{
    key: "overall_achievement",
    label: `${section} achievement`,
    description: "Award marks against the task requirements.",
    maximum: maximumMarks,
  }];
}
