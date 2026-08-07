import type { AppUser } from "@/lib/accounts";
import { saveStudentProfile } from "@/app/onboarding/actions";
import { educationBoardGroups, findEducationBoard } from "@/lib/education-boards";

export function StudentProfileForm({ user, returnTo }: { user: AppUser; returnTo: "onboarding" | "profile" }) {
  const selectedBoardCode = findEducationBoard(user.board ?? "")?.code ?? "";

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
          <span>Examination board</span>
          <select defaultValue={selectedBoardCode} name="boardCode" required>
            <option disabled value="">Select your board</option>
            {educationBoardGroups.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.boards.map((board) => (
                  <option key={board.code} value={board.code}>{board.shortName}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>School or college <small>optional</small></span>
        <input defaultValue={user.schoolName ?? ""} maxLength={200} name="schoolName" placeholder="For example, Islamabad Model College" />
      </label>
      <label className="profile-checkbox">
        <input defaultChecked={user.isSelfStudy} name="isSelfStudy" type="checkbox" value="yes" />
        <span>
          <strong>I study independently</strong>
          <small>Select this if you are preparing without a school or college.</small>
        </span>
      </label>
      <button className="button" type="submit">{returnTo === "profile" ? "Save profile" : "Continue to TestBench"}</button>
    </form>
  );
}
