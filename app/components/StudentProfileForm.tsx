import type { AppUser } from "@/lib/accounts";
import { saveStudentProfile } from "@/app/onboarding/actions";

const boards = [
  "FBISE",
  "BISE Lahore",
  "BISE Rawalpindi",
  "BISE Karachi",
  "Cambridge O Level",
  "Cambridge A Level",
  "Other",
];

export function StudentProfileForm({ user, returnTo }: { user: AppUser; returnTo: "onboarding" | "profile" }) {
  return (
    <form action={saveStudentProfile} className="profile-form">
      <input name="returnTo" type="hidden" value={returnTo} />
      <label>
        <span>Student name</span>
        <input defaultValue={user.displayName} maxLength={160} minLength={2} name="displayName" required />
      </label>
      <div className="profile-form-grid">
        <label>
          <span>Current level</span>
          <select defaultValue={user.gradeLevel ?? ""} name="gradeLevel" required>
            <option disabled value="">Select a level</option>
            <option value="grade_9">Grade 9</option>
            <option value="grade_10">Grade 10</option>
            <option value="o_level">O Level</option>
            <option value="a_level">A Level</option>
          </select>
        </label>
        <label>
          <span>Board or curriculum</span>
          <select defaultValue={user.board ?? "FBISE"} name="board" required>
            {boards.map((board) => <option key={board} value={board}>{board}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span>School or college <small>optional</small></span>
        <input defaultValue={user.schoolName ?? ""} maxLength={200} name="schoolName" placeholder="For example, Islamabad Model College" />
      </label>
      <button className="button" type="submit">{returnTo === "profile" ? "Save profile" : "Continue to TestBench"}</button>
    </form>
  );
}
