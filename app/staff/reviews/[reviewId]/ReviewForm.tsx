"use client";

import { useState } from "react";
import type { ReviewCriterion } from "@/lib/review-rubrics";
import { returnWritingReview } from "../../actions";

type Props = {
  criteria: ReviewCriterion[];
  existingFeedback: {
    priorityImprovement: string;
    rewriteInstruction: string;
    strength: string;
  };
  existingRubric: Record<string, number>;
  maximumMarks: number;
  reviewId: string;
  wasReturned: boolean;
};

export function ReviewForm({
  criteria,
  existingFeedback,
  existingRubric,
  maximumMarks,
  reviewId,
  wasReturned,
}: Props) {
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((criterion) => [criterion.key, existingRubric[criterion.key] ?? 0])),
  );
  const total = criteria.reduce((sum, criterion) => sum + (scores[criterion.key] ?? 0), 0);

  return (
    <form action={returnWritingReview} className="review-form">
      <input name="reviewId" type="hidden" value={reviewId} />
      <section className="panel rubric-panel">
        <div className="panel-heading">
          <div>
            <span className="card-kicker">MARKING RUBRIC</span>
            <h2>Award marks by criterion</h2>
          </div>
          <div className="rubric-total"><strong>{total}</strong><span>/ {maximumMarks}</span></div>
        </div>
        <div className="rubric-list">
          {criteria.map((criterion) => (
            <label key={criterion.key}>
              <span><strong>{criterion.label}</strong><small>{criterion.description}</small></span>
              <select
                aria-label={`${criterion.label} marks`}
                name={`rubric_${criterion.key}`}
                onChange={(event) => setScores((current) => ({
                  ...current,
                  [criterion.key]: Number(event.target.value),
                }))}
                value={scores[criterion.key] ?? 0}
              >
                {Array.from({ length: criterion.maximum + 1 }, (_, score) => (
                  <option key={score} value={score}>{score} / {criterion.maximum}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="panel feedback-panel">
        <span className="card-kicker">ACTIONABLE FEEDBACK</span>
        <h2>Tell the student what to keep and what to change</h2>
        <label htmlFor="strength">One clear strength</label>
        <textarea defaultValue={existingFeedback.strength} id="strength" minLength={8} name="strength" required />
        <label htmlFor="priorityImprovement">Priority improvement</label>
        <textarea defaultValue={existingFeedback.priorityImprovement} id="priorityImprovement" minLength={8} name="priorityImprovement" required />
        <label htmlFor="rewriteInstruction">Exact rewrite instruction</label>
        <textarea defaultValue={existingFeedback.rewriteInstruction} id="rewriteInstruction" minLength={8} name="rewriteInstruction" required />
        <div className="review-submit-row">
          <p>The student will see the marks and all three feedback notes immediately.</p>
          <button className="button" type="submit">
            {wasReturned ? "Update returned feedback" : "Return feedback to student"}
          </button>
        </div>
      </section>
    </form>
  );
}
