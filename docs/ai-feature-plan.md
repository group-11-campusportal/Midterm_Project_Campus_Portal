# AI Feature Plan: At-Risk Student Academic Advisor (UC-8 / Checklist F)

**Owner:** David Benz Susanto (`DavidBenzSusanto`)  
**Use Case:** UC-8 — AI: Flag at-risk students from grades and enrollments  
**Target:** Design Document §5 API Contract & Week 14 Integration

---

## 1. What the Feature Does

The **At-Risk Student Academic Advisor** helps the Administrator (Registrar) quickly identify students who need academic intervention during the term without manually inspecting every grade and enrollment row.

When the Administrator clicks **"Generate AI Risk Report"** on the Admin Dashboard:
1. The backend queries the database (`grades`, `enrollments`, and `users`) to compute each student's current credit-weighted GPA, low/failing scores (`score < 65`), and rejected or unapproved enrollments.
2. The backend sends this anonymized/structured academic summary to the Gemini model (`gemini-2.5-flash`) with a strict JSON schema prompt.
3. The backend returns a structured JSON list of flagged at-risk students, their risk level (`high` | `medium` | `low`), the specific academic reason, and a concrete advising recommendation.

---

## 2. API Route & Contract (for Design Document §5)

| Item | Specification |
|---|---|
| **Method & Path** | `POST /api/ai/at-risk-summary` |
| **Who Can Call It** | `administrator` only (`Authorization: Bearer <token>` + `requireRole('administrator')`) |
| **Rate / Size Limit** | `16kb` JSON body limit; scoped to a single academic `term` |

### Request Body
```json
{
  "term": "2024/2025"
}
```

### Example Success Response (`200 OK`)
```json
{
  "data": {
    "term": "2024/2025",
    "generatedAt": "2026-11-16T13:00:00.000Z",
    "overallSummary": "1 of 2 active students shows academic risk indicators for term 2024/2025.",
    "atRiskStudents": [
      {
        "studentId": "CS2023002",
        "studentName": "Bella Kusuma",
        "gpa": 3.0,
        "riskLevel": "medium",
        "reason": "Rejected enrollment in CS302 (Database Systems) and pending wait on full course CS310.",
        "recommendation": "Advise student to enroll in an alternative 3-credit elective with open capacity."
      }
    ]
  }
}
```

### Error Responses
| Status | Code | When |
|---|---|---|
| `400 Bad Request` | `INVALID_INPUT` | Missing or invalid `term` field |
| `401 Unauthorized` | `UNAUTHENTICATED` | Missing, invalid, or expired Bearer JWT |
| `403 Forbidden` | `FORBIDDEN` | Logged-in user is a `client` (student), not an `administrator` |
| `502 Bad Gateway` | `AI_FAILED` | Provider unreachable or answered with an error |
| `502 Bad Gateway` | `AI_BAD_RESPONSE` | Provider answered, but not with the expected JSON |
| `503 Service Unavailable` | `AI_UNAVAILABLE` | `GEMINI_API_KEY` is not configured on the server |
| `503 Service Unavailable` | `AI_RATE_LIMITED` | Provider rate limit (HTTP 429) |
| `504 Gateway Timeout` | `AI_TIMEOUT` | Provider did not answer within 20 s |

> Implemented in `backend/src/ai.js` and `backend/src/app.js` (status 22 Nov 2026). The response also
> carries `aiGenerated: true`, and student names are not sent to the provider.

---

## 3. Security & Where the API Key Lives (Checklist F)

- **Backend-Only Secret:** `GEMINI_API_KEY` is stored **exclusively** in the backend environment (`backend/.env` locally, and Railway Variables in production) and documented as an empty placeholder in `backend/.env.example`.
- **Never Exposed to Clients:** The key is **never** placed in `VITE_*` (web) or `EXPO_PUBLIC_*` (mobile) environment variables, ensuring it cannot be inspected in browser DevTools, network requests, or decompiled mobile bundles.
- **Server-Side Data Grounding:** The client only sends `{ "term": "2024/2025" }`. The backend reads authentic grade and enrollment rows directly from SQLite/Turso so a client cannot spoof grades or inject arbitrary prompts.
