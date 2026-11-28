# Audit checklist — 27 Nov 2026

An audit of the whole project (backend, web, mobile) on branch `feat/ai-course-recommendation`.
Each item says where the problem is, what goes wrong, and a suggested fix. Tick the box when it is fixed.

**Baseline when audited:** backend tests 39/39 pass, `npm run lint` is clean.

**Fixed on 27 Nov 2026:** all 31 items. Decisions taken: #7, a rejected request can be made again
(the row goes back to `pending`); #8, an admin can change `approved → rejected` while there is no grade;
#10, each course has an `isOpen` flag (migration v2, default open); #18, scores refuse more than 2
decimals instead of rounding; #22, the "Max 24 SKS" label was replaced by the real approved credits
(no limit was added); #24, Feedback links to the GitHub issues page. After the fixes: backend tests
50/50 pass, `npm run lint` is clean, and `vite build` passes. The mobile app was lint-checked but not
run on a phone.

**Labels**
- **Confirmed**: I ran it against an in-memory copy of the API and saw the problem.
- **Code**: found by reading the code; not run.

---

## 🔴 High: fix before the demo

- [x] **1. Web: refreshing the page while the API is slow logs you out.** *(Code)*
  - Where: [src/App.jsx:86](../src/App.jsx#L86): `.catch(() => clearToken())`
  - What goes wrong: any error from `/api/auth/me` deletes the token. This includes network errors, a
    Railway cold start, and a 500 error. The user refreshes, the API is slow, and they are sent back to login.
  - Fix: clear the token only when `error.status === 401`. For other errors, show a "Can't reach the
    server, retry" message. The mobile app already does this correctly ([AuthContext.js:42](../mobile-app/src/context/AuthContext.js#L42)).

- [x] **2. Backend: the AI at-risk report refuses terms longer than 20 characters.** *(Confirmed)*
  - Where: [backend/src/app.js:223](../backend/src/app.js#L223) uses `text(..., 'term', 20)`, but a course
    term can be up to 40 characters ([validation.js:27](../backend/src/validation.js#L27)).
  - What goes wrong: an admin creates a course with term `Semester Ganjil 2025/2026` (25 characters). It
    saves fine. Then the AI report for that term returns `400 term must be ... at most 20 characters`.
  - Fix: change the limit to 40 so it matches `courseInput`. Add a test.

- [x] **3. Backend: no rate limit on login, and the demo passwords are public.** *(Confirmed)*
  - Where: [backend/src/app.js:52](../backend/src/app.js#L52)
  - What goes wrong: I sent 20 wrong passwords for `admin` in a row and nothing slowed down or blocked.
    The passwords are printed in the README and on the login page.
  - Fix: add `express-rate-limit` on `/api/auth/login` (for example, 10 tries per 15 minutes per IP and
    username). Also check that the production Turso database has no `admin/admin123` account.
    Update [05-api-contract.md:64](design/05-api-contract.md), which says "no rate limiting".

- [x] **4. Backend: no limit on AI calls, so one user can use up the Gemini quota.** *(Confirmed)*
  - Where: [app.js:221](../backend/src/app.js#L221) (`/api/ai/at-risk-summary`) and
    [app.js:236](../backend/src/app.js#L236) (`/api/ai/course-recommendations`)
  - What goes wrong: 30 requests in a row from one student made 30 calls to the provider. With a free
    Gemini key, the quota can run out and the AI feature then fails for everyone, including during the demo.
  - Fix: add a per-user limit (for example, 5 per minute) that returns `429` with a clear message. You can
    also cache the last answer per user for a few minutes.

- [x] **5. Mobile: starting the app offline shows an admin the student screens.** *(Code)*
  - Where: [mobile-app/src/context/AuthContext.js:44-46](../mobile-app/src/context/AuthContext.js#L44-L46)
  - What goes wrong: when `/me` fails because of the network, the status becomes `signedIn` but `user`
    stays `null`. All screens use `user?.role !== 'administrator'` to decide "is student", so an admin
    sees the Recommend tab and the Enroll actions until they pull to refresh.
  - Fix: save the user object next to the token (in SecureStore) and load it on start, or show an
    "Offline, tap to retry" screen until `/me` works.

- [x] **6. Web: approve/reject shows an error even when it worked.** *(Code)*
  - Where: [src/App.jsx:117-119](../src/App.jsx#L117-L119)
  - What goes wrong: after the PATCH succeeds, the app fetches `/api/courses` again. If that second call
    fails, the whole function throws and the admin sees an error. If they try again, they get
    `409 Only pending enrollment requests can be approved...`.
  - Fix: put the course refresh in its own `try/catch`, or update the seat count in local state.

---

## 🟠 Medium: real edge cases in the rules

- [x] **7. A rejected student can never request the same course again.** *(Confirmed)*
  - Where: `UNIQUE (student_id, course_id)` in [schema.sql:35](../backend/src/schema.sql#L35) and the
    check at [app.js:137](../backend/src/app.js#L137)
  - What goes wrong: after a rejection, a new request returns `409 You already have an enrollment request
    for this course and term.` The message is confusing because the request was rejected. The web catalog
    also labels rejected courses as "Requested".
  - Fix (decide as a team): either (a) allow a new request after a rejection by setting the old row
    back to `pending` inside the transaction, or (b) keep the rule and show "Your request was rejected.
    Contact the registrar."

- [x] **8. An approved enrollment can never be undone.** *(Code)*
  - Where: [app.js:145-159](../backend/src/app.js#L145-L159) and [app.js:160-175](../backend/src/app.js#L160-L175)
  - What goes wrong: if the admin approves by mistake, or a student drops the course, there is no way
    back. Approved rows cannot be rejected or deleted. This also uses up a seat forever.
  - Fix: let the admin change `approved → rejected` (or delete it) when no grade exists yet.

- [x] **9. Changing a course's credits after grades exist changes old GPAs without warning.** *(Confirmed)*
  - Where: [app.js:87-103](../backend/src/app.js#L87-L103)
  - What goes wrong: I changed a graded course from 4 to 12 credits. The student's GPA went from 3.6 to
    3.825 with no warning. Code and term are already locked after enrollments exist, but credits are not.
  - Fix: block a credits change when the course has grades, the same way code and term are blocked.

- [x] **10. There is no "open term", so students can request courses from past terms.** *(Code)*
  - Where: `POST /api/enrollments` ([app.js:128](../backend/src/app.js#L128)) and
    `recommendationFacts` ([ai.js:192-197](../backend/src/ai.js#L192-L197))
  - What goes wrong: once an admin adds a new term, the old 2024/2025 courses can still be requested,
    and the AI may recommend them.
  - Fix (product decision): add an `is_open` column through migration v2 ([database.js:9](../backend/src/database.js#L9)),
    or treat the newest term as the only open one. Filter both enrollment and recommendations.

- [x] **11. The term "2024/2025" is hardcoded in many places.** *(Code)*
  - Web: `TERMS` in [FormPage.jsx:8](../src/pages/FormPage.jsx#L8); term tags in
    [FormPage.jsx:326](../src/pages/FormPage.jsx#L326), [Dashboard.jsx:306](../src/pages/Dashboard.jsx#L306)
    and [FormOutput.jsx:144](../src/pages/FormOutput.jsx#L144); the term filter has only one option at
    [FormOutput.jsx:348](../src/pages/FormOutput.jsx#L348); `term: '2024/2025'` in stats at
    [FormOutput.jsx:63](../src/pages/FormOutput.jsx#L63); the default in [AiAdvisor.jsx:9-13](../src/pages/AiAdvisor.jsx#L9-L13)
    and [CourseFormModal.jsx:3](../src/components/CourseFormModal.jsx#L3).
  - Mobile: [advisor.js:67-71](../mobile-app/src/app/(tabs)/advisor.js#L67-L71) and
    [CourseFormSheet.js:33](../mobile-app/src/components/CourseFormSheet.js#L33).
  - What goes wrong: courses in a new term cannot be picked in the term filter. The AI page always
    starts on 2024/2025, even when that term has no courses.
  - Fix: build the term list from `courses` (sorted, newest first) and default to the newest term.

- [x] **12. Web: the student's duplicate check uses the hardcoded term.** *(Code)*
  - Where: [FormPage.jsx:78-83](../src/pages/FormPage.jsx#L78-L83)
  - What goes wrong: it matches `courseCode` + the term `2024/2025`, not the course id. For a course in
    another term, the check never matches. The student submits and only then gets a raw 409 error.
  - Fix: check `enrollment.courseId === course.id`.

- [x] **13. A GPA of 0.00 is shown as "no grades".** *(Code)*
  - Where: [Dashboard.jsx:334](../src/pages/Dashboard.jsx#L334) and [Dashboard.jsx:395](../src/pages/Dashboard.jsx#L395)
    (`gpa > 0 ? ... : '—'`); [Profile.jsx:68](../src/pages/Profile.jsx#L68) (`gpa <= 0 ? 'No grades recorded yet'`)
    and [Profile.jsx:141](../src/pages/Profile.jsx#L141); check the same logic in the mobile
    `grades.js` / `profile.js`.
  - What goes wrong: a student whose grades are all F sees "—" and "No grades recorded yet". The
    at-risk student is hidden by the UI.
  - Fix: decide based on `myGrades.length === 0`, not on `gpa > 0`.

- [x] **14. AI advisor: the "all students are fine" message is shown when nobody is enrolled.** *(Code)*
  - Where: [AiAdvisor.jsx:203](../src/pages/AiAdvisor.jsx#L203)
  - What goes wrong: when no students have enrollments in the term, the server returns
    `aiGenerated: false` and the summary "No students have enrollments...". The page still says "All
    enrolled students meet academic progress thresholds".
  - Fix: when `report.aiGenerated === false`, show `report.overallSummary` instead.

- [x] **15. AI advisor: errors are matched by message text, not by error code.** *(Code)*
  - Where: [AiAdvisor.jsx:31-37](../src/pages/AiAdvisor.jsx#L31-L37) (`err.message?.includes('timeout')`)
  - What goes wrong: if the backend wording changes, users get the raw message. The `AI_RATE_LIMITED`
    message ("busy") only matches by luck.
  - Fix: switch on `err.code` (`AI_TIMEOUT`, `AI_UNAVAILABLE`, `AI_RATE_LIMITED`, ...) like
    [CourseRecommendation.jsx:18-23](../src/pages/CourseRecommendation.jsx#L18-L23) does.

- [x] **16. Web: no timeout and no friendly network error.** *(Code)*
  - Where: [src/lib/api.js:29](../src/lib/api.js#L29)
  - What goes wrong: when the API is down, the user sees the browser's raw text, for example
    "Failed to fetch". On a cold start, the request can hang with a spinner and no end.
  - Fix: add an `AbortController` timeout and a friendly message, like the mobile `apiFetch`
    ([mobile-app/src/lib/api.js:41-57](../mobile-app/src/lib/api.js#L41-L57)).

- [x] **17. Backend: one stuck database transaction blocks every write.** *(Code)*
  - Where: [backend/src/database.js:98-113](../backend/src/database.js#L98-L113)
  - What goes wrong: write transactions wait in a queue. If one Turso call hangs (a network problem),
    every later write in the process waits forever.
  - Fix: add a timeout (for example, 10 s) around `work(tx)` that rolls back and rejects.

---

## 🟡 Low: polish and small edge cases

- [x] **18. Scores keep any number of decimals.** *(Confirmed)* `84.99999` is saved and shown as
  `84.99999`, with the letter A-. Fix: round to 2 decimals on the server
  ([validation.js:32](../backend/src/validation.js#L32)) or reject more than 2 decimals.
- [x] **19. A space-only optional AI field returns 400.** *(Confirmed)* `interests: "   "` returns
  `interests must be a non-empty string`. Both apps trim the text first, so only direct API calls hit
  this. Fix: treat a trimmed empty string as "not given" ([app.js:238](../backend/src/app.js#L238)).
- [x] **20. Comma decimals are handled differently.** `EditGradeModal` does not accept `85,5`, but
  `RecordGradeModal` does ([EditGradeModal.jsx:24](../src/components/EditGradeModal.jsx#L24) vs
  [RecordGradeModal.jsx:43](../src/components/RecordGradeModal.jsx#L43)). Fix: use one parser.
- [x] **21. Old data can appear after switching accounts.** *(Code)* If a `loadPortalData` call from the
  previous session finishes after logout or a new login, it writes the old user's data
  ([App.jsx:45-76](../src/App.jsx#L45-L76)). Fix: ignore answers from an older request (keep a counter or
  ref). The same problem exists in mobile [useApiList.js](../mobile-app/src/lib/useApiList.js) on a fast
  double refresh.
- [x] **22. "Max 24 SKS" is shown but not enforced.** [FormPage.jsx:334](../src/pages/FormPage.jsx#L334).
  Either add a credit limit check in `POST /api/enrollments` or remove the label.
- [x] **23. Placeholder content looks like real data.** "UPH Verified"
  ([Dashboard.jsx:313](../src/pages/Dashboard.jsx#L313)), "Dean's List" labels, UPH links
  (already in PROGRESS bug #4).
- [x] **24. A personal student email is in the public bundle.** `FEEDBACK_URL` in
  [Profile.jsx:7](../src/pages/Profile.jsx#L7) and [mobile profile.js:20](../mobile-app/src/app/(tabs)/profile.js#L20).
  Use a team or project address instead.

---

## 🧹 Cleanup and docs

- [x] **25. Dead code: the admin "Record grade" form in `FormPage` cannot be reached.** `/form` sends
  admins to `/output` ([App.jsx:235](../src/App.jsx#L235)), so `validateGrade` / `handleGradeSubmit` in
  `FormPage.jsx` never run. Remove that code.
- [x] **26. The README routes table is wrong.** It says `/form` is "Record Grade (admin)" and lists only
  4 routes. It is missing `/enrollments`, `/profile`, `/ai-advisor` and `/course-recommendation`.
- [x] **27. Delete the unused `src/data/*.js`** (PROGRESS bug #3).
- [x] **28. The root `package.json` description is out of date** ("front-end only, hardcoded data").
- [x] **29. `render.yaml` is not used** (the API runs on Railway). Move it to `docs/` or delete it.
- [x] **30. CI does not run the backend tests or lint `mobile-app/`.** Add `npm test --prefix backend`
  to [deploy.yml](../.github/workflows/deploy.yml), or add a separate PR workflow (PROGRESS bug #6).
- [x] **31. Add tests for the fixes above**, especially #2, #7, #8, #9 and the rate limits (#3, #4).

---

## ✅ Checked and OK (no action)

- A student gets `404` for another student's enrollment or grade. The token decides what is visible, not the request.
- The role is read from the database on each request, so a changed role takes effect at once.
- JWT checks cover the algorithm, issuer, audience and expiry. A deleted account loses access.
- The capacity check and the approval run in one transaction. Pending requests do not use up seats.
- Passwords are bcrypt-hashed, and the 72-byte limit is checked. An unknown username still runs a hash
  check, so response timing does not reveal which usernames exist.
- AI output is checked: only known students or courses, at most 3 recommendations, and clipped text.
  Names are not sent to the provider.
- The seed script refuses to run against the production database (Turso).
- The JSON body is limited to 16 KB. Bad JSON returns a clean `400` error.
