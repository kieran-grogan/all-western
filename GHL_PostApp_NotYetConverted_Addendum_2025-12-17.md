# GoHighLevel Build Spec (v2 Addendum) — **Post App: Working (Not Yet Converted)**  
**Client:** Jason Young / All Western Mortgage  
**Based on:** Fathom transcript **Dec 17, 2025** + updated pipeline sheet screenshot  
**Goal:** Add the **Post App – Working – Not Yet Converted** pipeline + the exact GHL automations/workflows needed to support it (micro-workflow architecture).

> This file is written so you can paste into **Cursor/Codex** to generate a visual map and then build directly inside GHL.  
> It assumes your **Pre‑App claim system** already exists (Claim Page + Claim Processor workflow) from the prior build spec.

---

## 0) What changed (Dec 17 meeting)

You added a new pipeline section focused on what happens **after** an application is “taken” (SSN/DOB or credit pull / application completion), specifically:

1) **Automated Credit Review** (mini‑app injection)  
2) **Application Taken – Unengaged / Engaged / Not-from-a-lead** routing  
3) **Borrower docs lifecycle** (requested → received, plus a 24h + 36h cadence)  
4) **LO pre‑approval request checklist (form)** → creates a clean queue for **Jason**  
5) **Jason pre‑approval write‑up (form)** → routes to:
   - pre‑approval issued pipeline (later section),
   - or “need more info” back to LO,
   - or nurture/decline paths.

---

## 1) Create / confirm the Pipeline and Stages (exact names)

**Path:** `Opportunities → Pipelines → + New Pipeline`

### Pipeline C: **Post App – Working – Not Yet Converted**

Create these stages **in this order** (match your sheet):

1. **Automated Credit Review**  
2. **Application Taken - Unengaged**  
3. **Application Taken - Engaged**  
4. **Application Taken - Not from a Lead**  
5. **Borrower Docs Requested - Auto**  
6. **Borrower Docs Requested - Curated (if available)**  
7. **Borrower Docs Requested - Not received after 36 hours**  
8. **Borrower Docs Received**  
9. **Pending LO Pre-Approval Request**  
10. **Pre-Approval Requested**  
11. **Refinance Review Requested**  
12. **Pre-Approval Review - Jason Work Assignment**  
13. **Refinance Review - Jason Work Assignment**  
14. **Pre-Approval Wait - LO Work Assignment**

> Keep stage names identical to avoid confusion between sheet → HTML map → GHL.

---

## 2) One-time Setup in GHL (fields, tags, values)

### 2.1 Contact Custom Fields (create these if missing)

**Path:** `Settings → Custom Fields → Contacts → + Add Field`

#### (A) Blend identifiers / state
- **CF – Blend Application ID** (text)
- **CF – Blend Last Event Type** (text)
- **CF – Blend Credit Pulled** (checkbox)
- **CF – Blend SSN Entered** (checkbox) *(or “SSN/DOB Complete” if you prefer one flag)*
- **CF – Blend App Status** (dropdown: `started`, `in_progress`, `completed`, `archived`, `unknown`)
- **CF – Preferred Language (Blend)** (dropdown: `English`, `Spanish`, `Other`, `Unknown`)

#### (B) Credit review / decisioning
- **CF – Credit Review Status** (dropdown: `pending`, `complete`, `failed`)
- **CF – Credit Worthy** (dropdown: `yes`, `no`, `unknown`)
- **CF – Credit Summary (AI)** (multi-line text) *(store your “snapshot” output here)*
- **CF – Credit Review Timestamp** (date/time)

#### (C) Documentation tracking
- **CF – Docs Requested Timestamp** (date/time)
- **CF – Docs Received Timestamp** (date/time)
- **CF – Docs Followup Stage** (dropdown: `none`, `24h_sent`, `36h_sent`, `2day_cadence`, `closed_out`)
- **CF – Docs Last Followup Timestamp** (date/time)

#### (D) Pre-approval workflow tracking
- **CF – PreApproval LO Request Status** (dropdown: `not_started`, `in_progress`, `submitted`)
- **CF – PreApproval LO Request Timestamp** (date/time)
- **CF – PreApproval Jason Review Status** (dropdown: `not_started`, `in_review`, `needs_more_info`, `approved`, `declined`)
- **CF – PreApproval Jason Review Timestamp** (date/time)

#### (E) Routing / ownership helpers (optional but recommended)
- **CF – Source Type** (dropdown: `lead`, `not_from_lead`, `unknown`)
- **CF – LO User ID (Assigned)** (text)
- **CF – LO Email (Assigned)** (text)

---

### 2.2 Tags (recommended)

**Path:** `Contacts → Tags`

Create these tags:

- `POSTAPP | Entered`
- `POSTAPP | Credit Review Pending`
- `POSTAPP | Credit Review Complete`
- `POSTAPP | Credit Worthy - Yes`
- `POSTAPP | Credit Worthy - No`

- `DOCS | Requested`
- `DOCS | Received`
- `DOCS | Followup 24h`
- `DOCS | Followup 36h`
- `DOCS | Nurture`

- `PREAPPROVAL | LO Request Pending`
- `PREAPPROVAL | LO Request Submitted`
- `PREAPPROVAL | Jason Review Pending`
- `PREAPPROVAL | Jason Needs More Info`
- `PREAPPROVAL | Approved`
- `PREAPPROVAL | Declined`

- `REFI | Review Requested`

---

### 2.3 Custom Values (URLs + constants)

**Path:** `Settings → Custom Values`

Create these:

- `CV_CLAIM_PAGE_URL` = *(your existing claim page base URL)*  
  Example: `https://YOURDOMAIN.com/claim`  
- `CV_CLAIM_PAGE_URL_WITH_CONTACT` = `{{custom_values.CV_CLAIM_PAGE_URL}}?contactId={{contact.id}}`

- `CV_INTERNAL_JASON_EMAIL` = `jason@allwestern.com` *(or his internal email)*
- `CV_DOCS_NUDGE_24H_HOURS` = `24`
- `CV_DOCS_NUDGE_36H_HOURS` = `36`

---

## 3) Forms to build (internal)

> These are internal operational forms, not borrower-facing.

### 3.1 FORM — **LO Pre‑Approval Request (Checklist)**
**Path:** `Sites → Forms → Builder → + New Form`

**Name:** `FORM-LO-PREAPPROVAL-REQUEST`

**Form fields (recommended baseline):**
- Borrower contact selector is implicit (form submission attaches to the contact)
- Checkbox: `Credit reviewed`
- Checkbox: `All required borrower docs received`
- Checkbox: `Program options reviewed`
- Checkbox: `Income reviewed`
- Checkbox: `Assets reviewed`
- Checkbox: `Liabilities reviewed`
- Dropdown: `Loan purpose` (purchase/refi/other)
- Multi-line: `LO Notes / Risk flags / Exceptions`
- Dropdown: `Ready for Jason review?` (Yes/No) *(optional guardrail)*

**Submission actions:**
- Update custom fields:
  - `CF – PreApproval LO Request Status = submitted`
  - `CF – PreApproval LO Request Timestamp = now`
- (Optional) Add tag `PREAPPROVAL | LO Request Submitted`

> Jason said he’ll provide final field lists; when he does, just add them to this form and keep the workflow triggers the same.

---

### 3.2 FORM — **Jason Pre‑Approval Review (Write‑Up)**
**Name:** `FORM-JASON-PREAPPROVAL-WRITEUP`

**Form fields (baseline):**
- Dropdown: `Decision` (`approved`, `needs_more_info`, `declined`)
- Multi-line: `Jason Summary / Snapshot`
- Multi-line: `Conditions / Next steps`
- Multi-line: `Docs missing / Info required` *(shown if needs_more_info)*
- Dropdown: `Pre-approval validity window` (30/60/90 days, optional)
- Date: `Decision date` *(optional)*

**Submission actions:**
- Update custom fields:
  - `CF – PreApproval Jason Review Status` based on Decision
  - `CF – PreApproval Jason Review Timestamp = now`

---

### 3.3 (Optional) FORM — **Refinance Review Request**
**Name:** `FORM-REFI-REVIEW-REQUEST`

Fields: LO notes, borrower goals, timeline, etc.  
This lets the LO push a refi file into Jason’s queue cleanly.

---

## 4) Workflows to build (micro-workflow architecture)

> Naming convention used below: `WF-POSTAPP-XX – <Name>`  
> **Build as separate workflows** so each is debuggable and analytics-friendly.

---

# WF-POSTAPP-01 — Blend “Credit Pull / App Taken” Ingest → Enter Post-App Pipeline

### Purpose
When Blend indicates **credit pulled** (or “SSN/DOB captured / app taken”), this workflow:
1) ensures the opportunity exists,  
2) moves it into **Pipeline C**,  
3) enters **Automated Credit Review**,  
4) triggers the credit review mini-app.

### Trigger
Use **ONE** of these trigger patterns (choose what your middleware supports):

**Option A (recommended):** `Automation → Workflows → Trigger: Incoming Webhook`  
- Middleware calls this workflow’s webhook when `event_type = credit_pulled` (or equivalent).

**Option B:** Trigger on tag added  
- Trigger: `Contact Tag Added = BLEND | Credit Pulled` (if middleware tags contacts).

### Actions (in exact order)
1) **Guardrail / de-dupe**
   - If `Tag POSTAPP | Entered` exists → **Stop**.

2) **Set tracking**
   - Add tag: `POSTAPP | Entered`
   - Add tag: `POSTAPP | Credit Review Pending`
   - Set `CF – Credit Review Status = pending`
   - Set `CF – Credit Review Timestamp = now`
   - (If available from webhook) set:
     - `CF – Blend Application ID`
     - `CF – Blend App Status`
     - `CF – Loan Amount`
     - `CF – Preferred Language (Blend)`

3) **Create/Update Opportunity**
   - Action: `Create/Update Opportunity`
   - Pipeline: `Post App – Working – Not Yet Converted`
   - Stage: `Automated Credit Review`
   - Opportunity value: map to Loan Amount (or purchase price) if available.

4) **(Optional but recommended) Stop old workflows**
   - Remove from: Lead Intake V2 workflows (if any)  
   - Remove from: Pre-App monitoring workflows (if still active)

5) **Trigger the credit review mini-app**
   - Action: `Webhook` (outbound) to your micro-service endpoint
   - Payload should include:
     - Contact ID
     - Blend Application ID
     - Any available credit metadata
   - Expected result: your micro-service updates:
     - `CF – Credit Review Status = complete`
     - `CF – Credit Worthy = yes/no`
     - `CF – Credit Summary (AI)` (text)
     - Tags `POSTAPP | Credit Worthy - Yes/No`

6) **Wait for completion**
   - Action: `Wait until condition`
   - Condition: `CF – Credit Review Status = complete`
   - Timeout: 10 minutes *(or longer if your service is slow)*

7) **Route based on Credit Worthy**
   - If `CF – Credit Worthy = yes`:
     - Add tag: `POSTAPP | Credit Worthy - Yes`
     - Continue → **WF-POSTAPP-02 Router to App Taken stages** (Add to workflow)
   - Else if `CF – Credit Worthy = no`:
     - Add tag: `POSTAPP | Credit Worthy - No`
     - Add tag: `POSTAPP | Credit Review Complete`
     - Move to your nurture pipeline/stage (see WF-POSTAPP-90 placeholder)
   - Else (unknown/failed):
     - Add internal note / create task for LO to manually review
     - Move stage to `Application Taken - Engaged` (or keep in credit review) depending on preference

---

# WF-POSTAPP-02 — Route to “Application Taken” Stages (Unengaged / Engaged / Not-from-a-lead)

### Trigger
This is a **child workflow**, started by `WF-POSTAPP-01` OR by direct Blend “app completed” webhook.

### Actions
1) **Determine Source Type**
   - If `CF – Source Type = not_from_lead` OR webhook says “not from lead”:
     - Move stage → `Application Taken - Not from a Lead`
     - Add to workflow `WF-POSTAPP-03A Not-from-a-lead assignment`
     - Stop.
   - Else:
     - Continue.

2) **Determine Engagement State**
   - If contact has:
     - inbound SMS after app started, OR
     - connected call transcript, OR
     - any “customer replied” tag
     → Move stage `Application Taken - Engaged`
     → Add to workflow `WF-POSTAPP-04 Credit-worthy path to docs`
   - Else
     → Move stage `Application Taken - Unengaged`
     → Add to workflow `WF-POSTAPP-03 Unengaged claim + engagement watch`

---

# WF-POSTAPP-03 — Application Taken Unengaged → Claim (if needed) + Watch for Engagement

### Trigger
Start via `WF-POSTAPP-02` OR stage change into `Application Taken - Unengaged`.

### Actions
1) **Assignment check**
   - IF contact owner is **blank** / unassigned OR `CF – LO User ID (Assigned)` is empty:
     - **Call existing claim blast subsystem**:
       - Action: `Add to workflow → WF-CLAIM-01 Application Blast` *(from your pre-app build)*
     - (Optional) Add internal note: “PostApp claim blast sent.”
   - ELSE:
     - (Optional) Send internal notification to that LO: “Application completed; unengaged; please review.”

2) **Engagement watch**
   - `Wait for event` (up to 7 days):
     - “Customer Replied” *(SMS)* OR
     - “Call Status = completed” *(with transcript)* OR
     - “Conversation message received”
   - Timeout path:
     - Add tag `POSTAPP | Still Unengaged`
     - (Optional) Move to a nurture stage/pipeline later.

3) **On engagement detected**
   - Move stage → `Application Taken - Engaged`
   - Add to workflow → `WF-POSTAPP-04 Credit-worthy path to docs`

---

# WF-POSTAPP-03A — Application Taken Not-from-a-lead → Auto-assign correct LO

### Trigger
Start when stage becomes `Application Taken - Not from a Lead`.

### Actions
1) **Call Blend API / use middleware payload**
   - You need one field from Blend/middleware that identifies LO:
     - LO email, LO user id, or LO “originator id”

2) **Assign**
   - Action: `Assign Contact Owner` to that LO user (if available)
   - Set:
     - `CF – LO Email (Assigned)`
     - `CF – LO User ID (Assigned)`
     - `CF – Source Type = not_from_lead`

3) **Skip AI (optional policy)**
   - If Jason wants “leave AI out of it” for these:
     - Remove from all AI conversation workflows
     - Create internal task for LO instead.

4) **Proceed**
   - Move stage → `Application Taken - Engaged`
   - Add to workflow → `WF-POSTAPP-04 Credit-worthy path to docs`

---

# WF-POSTAPP-04 — Application Taken Engaged → Wait for Docs Requested event (or force doc request tracking)

### Purpose
Once engaged and credit-worthy, you are now waiting for Blend to request docs.

### Trigger
Start when stage becomes `Application Taken - Engaged`.

### Actions
1) **If docs already requested**
   - If `CF – Docs Requested Timestamp` is not empty OR tag `DOCS | Requested` exists:
     - Move stage → `Borrower Docs Requested - Auto` *(or Curated if you can detect)*
     - Add to workflow `WF-POSTAPP-10 Docs Requested Timer`
     - Stop.

2) **Otherwise: wait for doc request event**
   - Wait until tag `DOCS | Requested` exists OR `CF – Docs Requested Timestamp` is populated  
   - Timeout: 48h
   - If timeout:
     - Create internal task for LO: “Check Blend: docs request not detected”
     - Keep in `Application Taken - Engaged` until resolved.

---

# WF-POSTAPP-05 — Blend Docs Requested (Auto) Ingest

### Trigger (recommended)
`Incoming Webhook` called by middleware when Blend documentation request event happens.

You should call this when Blend emits its “documentation event created” (Jason referenced it on the application events doc).

### Actions
1) Set:
   - `CF – Docs Requested Timestamp = now`
   - `CF – Docs Followup Stage = none`
2) Add tag: `DOCS | Requested`
3) Move stage → `Borrower Docs Requested - Auto`
4) Add to workflow → `WF-POSTAPP-10 Docs Requested Timer`

---

# WF-POSTAPP-06 — (If available) Docs Curated detection

> Only implement if Blend/middleware can tell you “LO curated docs”.

### Trigger
Incoming webhook OR manual action (LO clicks a button / adds a tag).

### Actions
1) Move stage → `Borrower Docs Requested - Curated (if available)`
2) Add internal note: “Docs curated by LO”
3) (Optional borrower nurture) send a gentle SMS:
   - “We’ve requested a few items to complete your review — reply if you have questions.”

---

# WF-POSTAPP-07 — Blend Docs Uploaded Ingest (Docs Received)

### Trigger
Incoming webhook when borrower uploads docs (Jason: “Documents uploaded by Prospect”).

### Actions
1) Set:
   - `CF – Docs Received Timestamp = now`
   - `CF – Docs Followup Stage = closed_out`
2) Add tag: `DOCS | Received`
3) Move stage → `Borrower Docs Received`
4) **Stop doc follow-up workflow**
   - Remove from workflow `WF-POSTAPP-10 Docs Requested Timer` (if running)
5) **Notify LO**
   - Send internal email/notification to the assigned LO:
     - “Borrower docs received — complete pre-approval checklist.”
6) Move stage → `Pending LO Pre-Approval Request`
7) Add tag: `PREAPPROVAL | LO Request Pending`
8) Create Task (assigned to LO):
   - Title: “Complete LO Pre‑Approval Request checklist”
   - Due: 24 hours
   - Link: instructions to fill `FORM-LO-PREAPPROVAL-REQUEST`

---

# WF-POSTAPP-10 — Docs Requested Timer (24h + 36h + 2-day cadence)

### Trigger
Started by `WF-POSTAPP-05` (docs requested) OR stage change into either docs requested stage.

### Key rule
This workflow should **stop immediately** if `DOCS | Received` tag appears.

### Actions
1) **Wait 24 hours**
   - Wait: 24h from now
   - If tag `DOCS | Received` exists → STOP.

2) **24h nudge**
   - Send SMS (borrower):  
     “Quick check-in — we’re still waiting on a few documents to complete your review. Reply if you have questions.”
   - Add tag: `DOCS | Followup 24h`
   - Set `CF – Docs Followup Stage = 24h_sent`
   - Set `CF – Docs Last Followup Timestamp = now`

3) **Wait 12 more hours (to reach 36h total)**
   - Wait: 12h
   - If tag `DOCS | Received` exists → STOP.

4) **36h escalation**
   - Move stage → `Borrower Docs Requested - Not received after 36 hours`
   - Send SMS (borrower):  
     “We haven’t received the requested documents yet — your file will be placed on hold until we get them. Reply if you need help.”
   - Send internal email to LO + Jason (optional):
     - Subject: “Docs not received after 36h”
   - Add tag: `DOCS | Followup 36h`
   - Set `CF – Docs Followup Stage = 36h_sent`
   - Set `CF – Docs Last Followup Timestamp = now`

5) **2-day cadence loop**
   - Repeat:
     - Wait 48h
     - If docs received → STOP
     - Send 1 gentle reminder SMS/email
     - Update `CF – Docs Followup Stage = 2day_cadence`
   - End loop after 14 days (recommended) then:
     - Add tag `DOCS | Nurture`
     - Move to your nurture pipeline/stage (see WF-POSTAPP-90 placeholder)
     - Create LO task: “Disposition: Docs never received (confirm closeout)”

> Jason said “might stay indefinitely until LO dispositions it.”  
> If you truly want indefinite, remove the 14-day exit and instead rely on manual disposition.

---

# WF-POSTAPP-20 — LO Pre‑Approval Request Form Submitted → Jason Queue

### Trigger
`Form Submitted = FORM-LO-PREAPPROVAL-REQUEST`

### Actions (exact order)
1) Add tag: `PREAPPROVAL | LO Request Submitted`
2) Remove tag: `PREAPPROVAL | LO Request Pending`
3) Set:
   - `CF – PreApproval LO Request Status = submitted`
   - `CF – PreApproval LO Request Timestamp = now`
   - `CF – PreApproval Jason Review Status = not_started`
4) Move stage → `Pre-Approval Review - Jason Work Assignment`
5) Add tag: `PREAPPROVAL | Jason Review Pending`

6) **Create Task for Jason**
   - Title: “Pre-Approval Review (Complete write-up)”
   - Assigned to: Jason
   - Due: same day (or 24h)
   - Notes: include borrower name + pipeline stage + link to contact

7) **Send internal email to Jason**
   - To: `{{custom_values.CV_INTERNAL_JASON_EMAIL}}`
   - Subject: “Pre‑Approval Review Requested: {{contact.full_name}}”
   - Body should include:
     - Link to contact/opportunity
     - LO name
     - The key answers from the LO checklist form (merge fields)

8) (Optional) Notify LO
   - “Submitted to Jason for review.”

---

# WF-POSTAPP-30 — Jason Write‑Up Form Submitted → Decision Routing

### Trigger
`Form Submitted = FORM-JASON-PREAPPROVAL-WRITEUP`

### Actions
1) Set:
   - `CF – PreApproval Jason Review Timestamp = now`
   - `CF – PreApproval Jason Review Status` based on Decision
2) Remove tag: `PREAPPROVAL | Jason Review Pending`

3) **Branch on Decision**
   - If Decision = `approved`:
     - Add tag: `PREAPPROVAL | Approved`
     - Move opportunity to your next pipeline (Post App – Pre‑Approval Issued)  
       *(If not built yet, at least move to a placeholder stage or keep here with tag.)*
     - Send internal email to LO with approval summary + next steps
   - If Decision = `needs_more_info`:
     - Add tag: `PREAPPROVAL | Jason Needs More Info`
     - Move stage → `Pre-Approval Wait - LO Work Assignment`
     - Create task assigned to LO: “Provide requested info for re-review”
     - Send internal email to LO with missing items (merge fields)
   - If Decision = `declined`:
     - Add tag: `PREAPPROVAL | Declined`
     - Move to nurture pipeline/stage (see WF-POSTAPP-90 placeholder)
     - Send internal email to LO with decline notes (optional)

4) **Optional: loop back for re-review**
   - When LO completes missing items, they re-submit `FORM-LO-PREAPPROVAL-REQUEST`
   - That re-triggers `WF-POSTAPP-20` and returns to Jason’s queue cleanly.

---

# WF-POSTAPP-40 — Refinance Review Request → Jason Refi Queue

### Trigger
Either:
- `Tag added = REFI | Review Requested`, OR
- `Form Submitted = FORM-REFI-REVIEW-REQUEST`

### Actions
1) Move stage → `Refinance Review - Jason Work Assignment`
2) Create task for Jason (similar to pre-approval)
3) Send internal email to Jason with LO notes.

---

# WF-POSTAPP-90 — Placeholder: Post App Nurture Routing (not-credit-worthy OR docs-never-received)

### Why this exists
In your Dec 17 meeting you explicitly said:
- not credit worthy → nurture
- docs never received → nurture (line ~76 in sheet)

### Implementation (minimal for now)
Create a separate pipeline later, but for now you can:
- Move to a “Nurture” pipeline/stage (if already exists), OR
- Keep in Post App pipeline and apply tag-based status.

**Recommended:**
- Pipeline D: `Post App – Not Working – Nurture`
  - Stage: `Not Credit Worthy`
  - Stage: `Docs Never Received`
  - Stage: `Long-term Nurture`

---

## 5) Operational rules to enforce (so the system doesn’t break)

### 5.1 Do not restart timers on duplicate events
Any workflow triggered by Blend events should begin with:
- If `CF – Docs Requested Timestamp` already exists (or tag exists) → stop/reject duplicate.
- If `POSTAPP | Entered` exists → stop.

### 5.2 Always “stop the other workflow” when moving stages
When you move from:
- Docs requested → docs received, remove from docs timer workflow.
- Pre-app monitoring → post-app, remove from pre-app workflows.

### 5.3 Keep “customer-facing messaging” minimal
You agreed on:
- 24h gentle reminder
- 36h “file on hold”
- then every 2 days for a short period (or indefinite if you choose)

### 5.4 Keep Jason’s queue clean
Jason’s time sink is queue management. The forms + tasks solve that:
- LO checklist form submission = one standardized “request”
- Jason write-up form submission = one standardized “decision + next steps”

---

## 6) Mermaid flow (for your HTML visual)

```mermaid
flowchart TD
  A[Blend Credit Pull / App Taken] --> B[Stage: Automated Credit Review]
  B --> C[Micro-app: Credit Summary + Credit Worthy?]
  C -->|Yes| D[Stage: App Taken - Unengaged/Engaged Router]
  C -->|No| Z[Nurture Pipeline]

  D -->|Unengaged| E[Claim Blast (if unassigned)]
  E --> F[Wait for Reply/Call]
  F -->|Engaged| G[Stage: App Taken - Engaged]

  G --> H[Wait for Docs Requested Event]
  H --> I[Stage: Borrower Docs Requested - Auto/Curated]
  I --> J[Timer: 24h nudge → 36h escalation → 2-day cadence]
  J -->|Docs uploaded| K[Stage: Borrower Docs Received]
  K --> L[Stage: Pending LO Pre-Approval Request]
  L --> M[LO Checklist Form Submitted]
  M --> N[Stage: Pre-Approval Review - Jason Work Assignment]
  N --> O[Jason Write-up Form Submitted]
  O -->|Approved| P[Post App - Pre-Approval Issued]
  O -->|Needs info| Q[Stage: Pre-Approval Wait - LO Work Assignment]
  Q --> L
  O -->|Declined| Z
```

---

## 7) Quick build checklist (so you can execute fast)

1) Create **Pipeline C** + stages (Section 1).  
2) Create **custom fields + tags + custom values** (Section 2).  
3) Build **2 forms** (LO checklist + Jason write-up) (Section 3).  
4) Build workflows in this order:
   - `WF-POSTAPP-01` (ingest + credit review)
   - `WF-POSTAPP-02` (router)
   - `WF-POSTAPP-03` + `WF-POSTAPP-03A` (claim/unengaged + not-from-lead assign)
   - `WF-POSTAPP-05` + `WF-POSTAPP-07` (docs events ingest)
   - `WF-POSTAPP-10` (docs timer)
   - `WF-POSTAPP-20` (LO form → Jason queue)
   - `WF-POSTAPP-30` (Jason form → decision routing)
5) Confirm with middleware that the correct **Blend event → webhook** mapping exists.

---

## 8) Open decisions (leave placeholders in the HTML map)

- Exact “credit worthy” thresholds / logic for Decision AI
- Whether “Borrower Docs Requested - Curated” is detectable automatically
- Exact stage/pipeline names for:
  - `Post App – Pre-Approval Issued`
  - `Post App – Not Working – Nurture`
- Jason’s final field list for both forms

