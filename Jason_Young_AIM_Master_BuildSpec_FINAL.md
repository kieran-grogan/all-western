# AIM (GoHighLevel) + Blend — Master Build Spec  
**Client:** Jason Young / AllWestern  
**System Name:** AIM (built inside GoHighLevel)  
**Primary Automation Source:** Blend (via whitelisted webhook relay → GHL)  
**Purpose of this doc:** One clean, organized “single source of truth” for the entire build (pipelines + fields + tags + forms + workflows + build order + progress tracker).

---

## What this solves
- You had **multiple markdown files** with overlapping/conflicting workflow lists → your HTML builder/agent got confused.
- You needed **long-form workflow GOAL prompts** that Workflow AI can actually build from.
- You needed clarity on:
  - what **CF** means
  - which **pipeline/stage** to pick in “Update Opportunity Stage”
  - why “Wait for Engagement” steps fail validation

This file is intentionally structured so an agent can build:
- the system inside GHL
- and/or a visual HTML dashboard from the same structure.

---

## Glossary (plain English)
- **CF** = **Custom Field** (GHL: Settings → Custom Fields).  
  In workflows you will usually pick the action: **Update Contact Field**.
- **Opportunity** = the card inside **Opportunities → Pipelines**.
- **Pipeline / Stage** = the board + its columns.
- **Trigger Link** = a trackable link used like a “button click” (great for manual failsafes).
- **LO** = Loan Officer.

---

## Build rules that prevent workflow errors
1. **Build Pipelines + Stages first** (exact names).  
   If you don’t, workflow actions like “Update Opportunity” won’t find the target stage.
2. **Do not use “Wait for Contact Reply” unless you sent a message earlier in the SAME workflow.**  
   Otherwise the wait step can’t reference a comm step and GHL throws the validation error you saw.
3. Every “first wins” process needs a lock:
   - Tag lock: `CLAIM | Locked` (recommended)
4. Blend triggers the compliance events (RESPA, disclosures, milestones).  
   GHL workflows are the routing + guardrails layer.

---

# 1) Neat build sequence (do this in order)

## Phase 0 — Prereqs
- [ ] Blend webhook relay is live + whitelisted (Blend → relay → GHL)
- [ ] All LOs + Jason exist as users in GHL
- [ ] SMS/Voice connected for the GHL Location
- [ ] Internal email sender is configured (for internal notifications)

## Phase 1 — Global setup (used across every pipeline)
1. [ ] Create tags
2. [ ] Create custom fields (in folders)
3. [ ] Create trigger links (manual failsafes)

## Phase 2 — Pipelines + Stages
4. [ ] Create each pipeline and stage (exact names)

## Phase 3 — Forms + Internal Pages (mini apps)
5. [ ] Build internal forms (Claim, LO Pre-Approval Request, Jason Review, Ops Submission)
6. [ ] Build LO Claim Page

## Phase 4 — Workflows
7. [ ] Build workflows in the order listed in the Workflow Library

## Phase 5 — QA
8. [ ] Run the QA checklist end-to-end

---

# 2) Categorized grouping by pipeline (stages + fields + tags + workflows)

> **Tip for the HTML agent:** each pipeline section is a clean block containing:  
> **Stages → Required CFs → Required Tags → Supporting Workflows**

---

## PIPELINE GROUP A — PRE‑APP

<details>
<summary><strong>Pipeline A1: Pre‑Application — Unassigned</strong></summary>

### Purpose
New/early leads not assigned to an LO yet. Early AI/SMS engagement. Blend monitoring runs here until app completion.

### Stages (top → bottom)
1. `Unassigned - New`
2. `Unassigned - New - No Response`
3. `Unassigned - Responded - AI Engaged`
4. `Unassigned - Application Started - Actively Completing`
5. `Unassigned - Working on Application (Blend Monitoring)`
6. `Unassigned - Engaged - Awaiting Assignment`
7. `Spanish Speaking - No Response`
8. `Spanish Speaking - AI Engaged/LO Call Transcript`
9. `Not Interested`
10. `Move to Post-App Queue App Taken`
11. `DNC - Specific DNC Request`

### Required Custom Fields (CFs)
- `CF - Blend Lead ID`
- `CF - Blend Application ID`
- `CF - Blend Last Activity At`
- `CF - Preferred Language`

### Required Tags
- `Lang | Spanish`
- `Lang | Other`
- `DNC | All`
- `DNC | Specific`

### Supporting Workflows
- WF-BLEND-01 — Blend Ingest + Initial SMS
- WF-BLEND-02 — Blend Monitoring Loop
- WF-BLEND-03 — Inactivity Escalation (Call Blast)
- WF-ROUTE-01 — Language Routing
- WF-UTIL-01 — DNC Handling

</details>

---

<details>
<summary><strong>Pipeline A2: Pre‑Application — Assigned</strong></summary>

### Purpose
Lead is assigned to a specific LO. SLA “first touch” gate ensures the LO engages quickly or the lead is re-routed.

### Stages
1. `SMS Engaged with AI`
2. `SMS Engaged with LO`
3. `Phone Engaged with LO`
4. `Blend App Started - Unengaged`
5. `Blend App Started - Engaged with AI`
6. `Blend App Started - Engaged with LO`
7. `Retargeted to New LO (Exclude Current Assignment)`

### Required Custom Fields (CFs)
- `CF - Assigned LO User ID`
- `CF - Assigned LO Name`
- `CF - LO Claim Timestamp`
- `CF - LO First Touch Completed`
- `CF - LO First Touch At`

### Required Tags
- `SLA | Gate Active`
- `SLA | Met`
- `CLAIM | Locked`
- `CLAIM | Won`

### Supporting Workflows
- WF-CLAIM-01 — Application Blast
- WF-CLAIM-02 — Claim Processor (first claim wins)
- WF-GATE-01 — SLA First Touch Gate (30 min)
- WF-GATE-02 — SLA Engagement Listener (sets First Touch Completed)

</details>

---

<details>
<summary><strong>Pipeline A3: Pre‑App — Not Working (Nurture)</strong></summary>

### Purpose
Fallout bucket for pre-app leads. Minimal automation on launch; nurture sequences can be built post-launch.

### Stages
- `Not Interested`
- `Went With Another Lender`
- `Process On Hold`
- `Engaged - Never Completed Application`
- `Credit Event - Seasoning Date`
- `Other / Review`

### Required Custom Fields (CFs)
- `CF - Not Working Reason`
- `CF - Credit Seasoning Date`

### Required Tags
- `PreApp | Not Working`

### Supporting Workflows
- WF-NUR-PRE-01 — Pre-App Not Working Router
- WF-NUR-02 — Credit Seasoning Follow-up Scheduler (optional)

</details>

---

# PIPELINE GROUP B — POST‑APP

<details>
<summary><strong>Pipeline B1: Post‑App — Working — Not Yet Converted</strong></summary>

### Purpose
Application is “taken” (completed) but the loan is not yet fully approved/converted. Credit review, docs, LO pre-approval request, Jason review.

### Stages
- `Automated Credit Review`
- `Application Taken - Unengaged`
- `Application Taken - Engaged`
- `Application Taken - Not from a Lead`
- `Credit Worthy? Yes - Request Documents / No - Nurture`
- `Borrower Docs Requested - Auto`
- `Borrower Docs Requested - Curated (if available)`
- `Borrower Docs Requested - Not received after 36 hours`
- `Borrower Docs Received`
- `Pending LO Pre-Approval Request`
- `Pre-Approval Requested`
- `Refinance Review Requested`
- `Pre-Approval Review - Jason Work Assignment`
- `Refinance Review - Jason Work Assignment`
- `Pre-Approval Wait - LO Work Assignment`

### Required Custom Fields (CFs)
- `CF - Credit Worthy`
- `CF - Credit Summary`
- `CF - Borrower Docs Requested At`
- `CF - Borrower Docs Request Type`
- `CF - Borrower Docs Received At`
- `CF - LO Pre-Approval Request Completed`
- `CF - LO Pre-Approval Request At`
- `CF - Jason Decision`
- `CF - Jason Review Write-Up`

### Required Tags
- `PostApp | Still Unengaged`
- `PostApp | Docs Requested`
- `PostApp | Docs Received`
- `PostApp | Pending LO PreApproval`
- `PostApp | Jason Review Needed`
- `PostApp | Waiting on LO`
- `PostApp | Not Credit Worthy`

### Supporting Workflows
- WF-POST-01 — Post-App Ingest + Credit Review Injection
- WF-POST-02 — Credit Review Micro-App (DecisionAI webhook)
- WF-POST-03 — App Taken Router (engaged vs unengaged vs not-from-lead)
- WF-POST-04 — Docs Requested Handler
- WF-POST-05 — Docs Reminder Cadence (24h/36h/2d)
- WF-POST-06 — Docs Received → Pending LO Pre-Approval Request
- WF-POST-07 — LO Pre-Approval Request Form Handler
- WF-POST-08 — Jason Review Write-Up Handler
- WF-POST-09 — Pre-Approval Wait Loop (Need More Info)

</details>

---

<details>
<summary><strong>Pipeline B2: Post‑App — Pre‑Approval Issued</strong></summary>

### Purpose
Pre-approval has been issued. Borrower is home shopping. Branch based on whether realtor info exists.

### Stages
- `Needs a Realtor`
- `Actively Looking for Homes`
- `Potential Hostile Realtor` (manual)
- `Offers Placed` (manual)
- `Pre-Approved No Longer Active` (manual)

### Required Custom Fields (CFs)
- `CF - Realtor Name`
- `CF - Realtor Phone`
- `CF - Realtor Email`
- `CF - Hostile Realtor Flag`
- `CF - Offers Placed Flag`

### Required Tags
(optional — only if you want tagging here)

### Supporting Workflows
- WF-PAI-01 — Pre-Approval Issued Router
- WF-PAI-02 — Realtor Added Listener (optional)
- Manual override system for hostile/offers/no longer active

</details>

---

<details>
<summary><strong>Pipeline B3: Post‑App — Under Contract / Processing</strong></summary>

### Purpose
RESPA + disclosures + ops submission gate + processing/underwriting milestone tracking until close.

### Stages
- `RESPA Triggered - Refinance (Holding)`
- `RESPA Triggered - Not Pre-Approved (Alert)`
- `Under Contract - Needs Initial Disclosures`
- `Under Contract - Initial Disclosures Sent`
- `Under Contract - Initial Disclosures Signed`
- `Operations Submission - Jason Work Assignment`
- `Submitted to Operations`
- `In Processing`
- `Submitted to Underwriting`
- `In Underwriting`
- `UW Approval Issued`
- `Clear to Close`
- `Closed Funded`

### Required Custom Fields (CFs)
- `CF - Loan Purpose`
- `CF - Property Address`
- `CF - RESPA Triggered`
- `CF - Initial Disclosures Sent At`
- `CF - Initial Disclosures Signed At`

### Supporting Workflows
- WF-UC-01 — RESPA Trigger Router
- WF-UC-02 — Disclosures Sent Sync
- WF-UC-03 — Disclosures Signed Sync
- WF-UC-04 — Ops Submission Request Form Handler
- WF-UC-05 — Jason Approval → Submitted to Ops
- WF-UC-06 — Processing/Underwriting Stage Sync
- WF-UC-07 — Closed Funded → Congrats

</details>

---

# PIPELINE GROUP C — NURTURE / CLOSED

<details>
<summary><strong>Pipeline C1: Post‑App — Not Working (Nurture)</strong></summary>

### Purpose
Post-app fallout bucket (docs never received, not credit worthy, etc). Nurture built after launch.

### Stages
- `Viable Loan - Docs Never Received`
- `Not Credit Worthy`
- `Long-Term Credit Drip`
- `Other / Review`

### Required Custom Fields (CFs)
- `CF - Not Working Reason`

### Required Tags
- `PostApp | Not Working`

### Supporting Workflows
- WF-NUR-POST-01 — Post-App Not Working Router
</details>

<details>
<summary><strong>Pipeline C2: Closed / Funded (optional separate pipeline)</strong></summary>

### Purpose
Closed funded milestone and post-close nurture.

### Stages
- `Closed Funded`
- `Post-Close Nurture`

### Required Tags
- `Closed | Funded`

### Supporting Workflows
- WF-UC-07 — Closed Funded → Congrats
</details>

---

# 3) Forms & Internal Pages (mini-apps)

## Form: LO Lead Claim Form (internal)
**Where:** Sites → Forms  
**Used by:** WF-CLAIM-02  
**Fields (minimum):**
- Hidden: `CF - Blend Lead ID`
- Hidden: `CF - Blend Application ID`
- Checkbox: “I am ready to contact now.”

## Page: LO Claim Page
**Where:** Sites → Websites/Funnels  
**Used by:** WF-CLAIM-01 notifications  
Embed LO Lead Claim Form. This is the “everyone gets same response time” link.

## Form: LO Pre‑Approval Request Form (internal)
Used by: WF-POST-07  
Fields: scenario notes, checklist confirmations, program recommendation.

## Form: Jason Review Write‑Up Form (internal)
Used by: WF-POST-08  
Fields: decision dropdown, write-up notes, next steps.

## Form: Ops Submission Request Form (internal)
Used by: WF-UC-04  
Fields: contract/property confirmation, closing timeline, ready-to-submit checkbox.

---

# 4) Workflow Library (long-form GOAL prompts for Workflow AI)

> Every workflow below has a **GOAL prompt** designed to be copy/pasted into Workflow AI.  
> You still must review the generated workflow to ensure it references the **exact** pipeline/stage/tag/CF names above.

---

## PRE‑APP WORKFLOWS

### WF-LEAD-01 — Lead Intake V2 (Non-Blend leads)
**What it does:** Creates/updates opportunity for leads that come from Zillow/MRC/etc before Blend exists.

**GOAL (paste into Workflow AI)**
```text
Build a workflow named "WF-LEAD-01 — Lead Intake V2 (Non-Blend leads)".

Trigger: New lead/contact created OR inbound form submitted from Zillow/MRC (choose the correct trigger you use).

Requirements:
1) Create/Update an Opportunity in pipeline "Pre‑Application — Unassigned" at stage "Unassigned - New".
2) If loan amount is missing, tag the contact for review (optional).
3) Send an initial SMS to the lead (unless DNC tags exist).
4) If language is Spanish, add tag "Lang | Spanish" and move stage to "Spanish Speaking - No Response".
5) Update CF - Blend Lead ID / Application ID only if present (otherwise leave blank).
```

---

### WF-BLEND-01 — Blend Ingest + Initial SMS
**Trigger:** Incoming webhook event: Blend user/application created

**GOAL**
```text
Build a workflow named "WF-BLEND-01 — Blend Ingest + Initial SMS".

Trigger: Incoming webhook from Blend (or middleware) that includes:
- Blend Lead ID and/or Blend Application ID
- phone/email
- (optional) loan purpose, loan amount

Steps:
1) Upsert the contact by phone/email.
2) Set:
   - CF - Blend Lead ID
   - CF - Blend Application ID
   - CF - Blend Last Activity At = now
3) If contact has tag "DNC | All" or "DNC | Specific": stop (no borrower messages).
4) Create/Update Opportunity in pipeline "Pre‑Application — Unassigned" stage "Unassigned - New".
5) Send borrower initial SMS acknowledging they started (include link if available).
6) Move stage to "Unassigned - Application Started - Actively Completing" if the event indicates they started the app.
7) Start monitoring (add tag or add to workflow WF-BLEND-02).
```

---

### WF-BLEND-02 — Blend Monitoring Loop
**Trigger:** Opportunity stage becomes `Unassigned - Working on Application (Blend Monitoring)`

**GOAL**
```text
Build a workflow named "WF-BLEND-02 — Blend Monitoring Loop".

Trigger: Opportunity stage changes to "Unassigned - Working on Application (Blend Monitoring)".

Loop behavior:
1) Wait 5 minutes.
2) Send a webhook to middleware to check application status for the contact using CF - Blend Application ID.
3) Middleware updates:
   - CF - Blend Last Activity At
   - CF - Blend SSN Entered
   - CF - Blend DOB Entered
   - and triggers a completion event when finished.
4) If completion is detected, move to stage "Move to Post-App Queue App Taken" and add to post-app ingest workflow WF-POST-01.
5) If inactivity > 45 minutes, trigger WF-BLEND-03 escalation.
6) Otherwise loop again.
Stop if contact has DNC tags.
```

---

### WF-BLEND-03 — Inactivity Escalation (Call Blast)
**Trigger:** Inactivity threshold reached (CF Last Activity old OR middleware event)

**GOAL**
```text
Build a workflow named "WF-BLEND-03 — Inactivity Escalation (Call Blast)".

Trigger: Either
- a tag "Blend | Inactivity 45m" is added
OR
- a custom field indicates last activity is older than 45 minutes while still in "Unassigned - Working on Application (Blend Monitoring)".

Actions:
1) Move stage to "Unassigned - New - No Response" (or keep stage but mark inactivity).
2) Start an internal call blast micro-process (notify LO group or assign a caller).
3) Send borrower a gentle SMS: "Need help finishing your application?"
4) Stop if borrower resumes activity (middleware updates CF - Blend Last Activity At and triggers stage change).
```

---

### WF-CLAIM-01 — Application Blast (Notify all LOs)
**Trigger:** Opportunity enters:
- `Unassigned - Engaged - Awaiting Assignment` OR `Application Taken - Unengaged`
AND contact owner is empty

**GOAL**
```text
Build a workflow named "WF-CLAIM-01 — Application Blast (Notify all LOs)".

Trigger: Opportunity enters either:
- Pipeline "Pre‑Application — Unassigned" stage "Unassigned - Engaged - Awaiting Assignment"
OR
- Pipeline "Post‑App — Working — Not Yet Converted" stage "Application Taken - Unengaged"
AND the contact owner is empty.

Actions:
1) Add tag "SLA | Gate Active".
2) Set CF - LO First Touch Completed = false.
3) Send internal notification to ALL LO users with the LO Claim Page link.
4) Send internal notification to Jason as well.
5) Do not use "Wait for reply" steps here.
```

---

### WF-CLAIM-02 — Claim Processor (First claim wins)
**Trigger:** LO Claim Form submitted

**GOAL**
```text
Build a workflow named "WF-CLAIM-02 — Claim Processor (First claim wins)".

Trigger: Form submitted = LO Lead Claim Form.

Logic:
- If tag "CLAIM | Locked" exists: stop (do nothing).
- Else:
  1) Add tags "CLAIM | Locked" and "CLAIM | Won".
  2) Assign contact owner to the submitting LO.
  3) Set:
     - CF - Assigned LO User ID
     - CF - Assigned LO Name
     - CF - LO Claim Timestamp = now
  4) If current pipeline is "Pre‑Application — Unassigned":
       Move opportunity to pipeline "Pre‑Application — Assigned" stage "Blend App Started - Unengaged".
     Else if current pipeline is "Post‑App — Working — Not Yet Converted":
       Keep stage "Application Taken - Unengaged" (do not mark engaged yet).
  5) Add to workflow "WF-GATE-01 — SLA First Touch Gate".
  6) Notify the winning LO and Jason.
```

---

### WF-GATE-01 — SLA First Touch Gate (30 min)
**Trigger:** Tag added `SLA | Gate Active` OR contact owner assigned

**GOAL**
```text
Build a workflow named "WF-GATE-01 — SLA First Touch Gate (30 min)".

Trigger: Tag "SLA | Gate Active" is added OR contact owner becomes assigned.

Steps:
1) Ensure CF - LO First Touch Completed is false.
2) Wait 30 minutes.
3) If CF - LO First Touch Completed is still false:
   - Move stage to "Retargeted to New LO (Exclude Current Assignment)" (pipeline "Pre‑Application — Assigned") if the lead is still pre-app.
   - Trigger a new claim blast (WF-CLAIM-01).
   - Notify Jason.
4) If CF - LO First Touch Completed is true:
   - Remove tag "SLA | Gate Active"
   - Add tag "SLA | Met"
   - Stop.
```

---

### WF-GATE-02 — SLA Engagement Listener (marks First Touch Completed)
**Trigger:** Trigger link clicked OR task completed OR call outcome (choose best)

**GOAL**
```text
Build a workflow named "WF-GATE-02 — SLA Engagement Listener".

Trigger:
- Trigger Link clicked = "TL - SLA First Touch Complete"
(Optionally also: task completed or call status events)

Actions:
1) Set CF - LO First Touch Completed = true
2) Set CF - LO First Touch At = now
3) Remove tag "SLA | Gate Active"
4) Add tag "SLA | Met"
5) If lead is in Pre‑Application — Assigned:
    - If engagement type is SMS: move stage to "Blend App Started - Engaged with LO"
    - If engagement type is call: move stage to "Phone Engaged with LO"
6) If lead is in Post‑App Working:
    - move stage to "Application Taken - Engaged"
```

---

### WF-ROUTE-01 — Language Routing
**GOAL**
```text
Build a workflow named "WF-ROUTE-01 — Language Routing".

Trigger: Contact reply OR a language detection field is set.

Logic:
- If Preferred Language = Spanish:
   - Add tag "Lang | Spanish"
   - Move stage to "Spanish Speaking - No Response" (if not assigned) or flag LO
- Else if Other:
   - Add tag "Lang | Other"
Stop if DNC tags exist.
```

---

### WF-UTIL-01 — DNC / STOP Handler
**GOAL**
```text
Build a workflow named "WF-UTIL-01 — DNC / STOP Handler".

Trigger: inbound message contains STOP/UNSUBSCRIBE or contact is marked DND.

Actions:
1) Add tag "DNC | All" (or "DNC | Specific" depending on policy).
2) Stop all borrower messaging workflows (remove from workflows if you use that).
3) Move opportunity to stage "DNC - Specific DNC Request" if an opportunity exists.
4) Notify Jason internally.
```

---

## POST‑APP WORKFLOWS (Not Yet Converted)

### WF-POST-01 — Post-App Ingest + Credit Review Injection
**GOAL**
```text
Build a workflow named "WF-POST-01 — Post-App Ingest + Credit Review Injection".

Trigger: Blend event indicates "Application Completed" OR "Credit Pulled".

Actions:
1) Create/Update Opportunity in pipeline "Post‑App — Working — Not Yet Converted" stage "Automated Credit Review".
2) Send webhook to DecisionAI credit review service (or internal process) and store output in:
   - CF - Credit Summary
   - CF - Credit Worthy (Yes/No/Unknown)
3) If Credit Worthy = No:
   - Move to pipeline "Post‑App — Not Working (Nurture)" stage "Not Credit Worthy"
   - Add tag "PostApp | Not Credit Worthy"
4) Else:
   - Add to workflow WF-POST-03 router.
```

---

### WF-POST-02 — Credit Review Micro-App (DecisionAI webhook)
**GOAL**
```text
Build a workflow named "WF-POST-02 — Credit Review Micro-App".

Trigger: Opportunity enters stage "Automated Credit Review".

Actions:
1) Call DecisionAI via webhook (include contact + Blend IDs).
2) Save response to CF - Credit Summary and CF - Credit Worthy.
3) End (router workflow handles next stage).
```

---

### WF-POST-03 — App Taken Router (Engaged vs Unengaged vs Not-from-Lead)
**GOAL**
```text
Build a workflow named "WF-POST-03 — App Taken Router".

Trigger: Stage = "Automated Credit Review" completed OR Credit Review finished.

Logic:
- If contact owner is empty: move to "Application Taken - Unengaged" and trigger WF-CLAIM-01.
- If owner exists but borrower not engaged: keep "Application Taken - Unengaged" and add tag "PostApp | Still Unengaged".
- If borrower engaged: move to "Application Taken - Engaged".
- If not-from-lead flag exists: move to "Application Taken - Not from a Lead".
```

---

### WF-POST-04 — Borrower Docs Requested Handler
**GOAL**
```text
Build a workflow named "WF-POST-04 — Borrower Docs Requested Handler".

Trigger: Blend event "Docs Requested" with request type.

Actions:
1) Set CF - Borrower Docs Requested At = now
2) Set CF - Borrower Docs Request Type = Auto or Curated
3) Move stage:
   - Auto → "Borrower Docs Requested - Auto"
   - Curated → "Borrower Docs Requested - Curated (if available)"
4) Add tag "PostApp | Docs Requested"
5) Add to workflow WF-POST-05 reminders
```

---

### WF-POST-05 — Docs Reminder Cadence (24h / 36h / every 2 days)
**GOAL**
```text
Build a workflow named "WF-POST-05 — Docs Reminder Cadence".

Trigger: Stage enters any "Borrower Docs Requested" stage.

Steps:
1) Wait 24 hours
2) If docs not received:
   - send borrower reminder SMS
3) Wait 12 hours (36 total)
4) If docs not received:
   - move stage to "Borrower Docs Requested - Not received after 36 hours"
   - send stronger borrower reminder
   - notify LO internally
5) Then loop every 2 days for up to N cycles until docs received.
Stop if docs received or moved to nurture or DNC.
```

---

### WF-POST-06 — Docs Received → Pending LO Pre‑Approval Request
**GOAL**
```text
Build a workflow named "WF-POST-06 — Docs Received → Pending LO Pre‑Approval Request".

Trigger: Blend event "Docs Uploaded/Received".

Actions:
1) Set CF - Borrower Docs Received At = now
2) Move stage to "Borrower Docs Received"
3) Immediately move stage to "Pending LO Pre-Approval Request"
4) Add tag "PostApp | Pending LO PreApproval"
5) Notify assigned LO to complete the LO Pre‑Approval Request Form
```

---

### WF-POST-07 — LO Pre‑Approval Request Form Handler
**GOAL**
```text
Build a workflow named "WF-POST-07 — LO Pre‑Approval Request Form Handler".

Trigger: LO Pre‑Approval Request Form submitted.

Actions:
1) Set CF - LO Pre-Approval Request Completed = true
2) Set CF - LO Pre-Approval Request At = now
3) Move stage to "Pre-Approval Requested"
4) Move stage to "Pre-Approval Review - Jason Work Assignment"
5) Add tag "PostApp | Jason Review Needed"
6) Notify Jason internally (email + notification)
```

---

### WF-POST-08 — Jason Review Write‑Up Handler
**GOAL**
```text
Build a workflow named "WF-POST-08 — Jason Review Write‑Up Handler".

Trigger: Jason Review Write‑Up Form submitted.

Actions:
1) Set:
   - CF - Jason Review Completed = true
   - CF - Jason Review At = now
   - CF - Jason Decision
   - CF - Jason Review Write-Up
2) Remove tag "PostApp | Jason Review Needed"
3) Route:
   - If decision Approved → add to workflow WF-PAI-01 Pre-Approval Issued Router
   - If decision Need More Info → move stage "Pre-Approval Wait - LO Work Assignment" + notify LO
   - If decision Declined or Not Credit Worthy → move to pipeline "Post‑App — Not Working (Nurture)" stage "Not Credit Worthy" + add tag
```

---

### WF-POST-09 — Pre‑Approval Wait Loop (Need More Info)
**GOAL**
```text
Build a workflow named "WF-POST-09 — Pre‑Approval Wait Loop".

Trigger: Stage enters "Pre-Approval Wait - LO Work Assignment".

Actions:
1) Notify LO what Jason needs (include CF - Jason Review Write-Up).
2) Wait 48 hours.
3) If LO has NOT resubmitted Pre‑Approval Request Form:
   - notify LO again
   - notify Jason
4) Stop when LO submits the form again (will re-trigger WF-POST-07).
```

---

## PRE‑APPROVAL ISSUED WORKFLOWS

### WF-PAI-01 — Pre‑Approval Issued Router (Needs Realtor vs Actively Looking)
**GOAL**
```text
Build a workflow named "WF-PAI-01 — Pre‑Approval Issued Router".

Trigger: Either
- Blend event "Pre‑Approval Issued"
OR
- CF - Jason Decision becomes "Approved"

Logic:
1) Move opportunity to pipeline "Post‑App — Pre‑Approval Issued".
2) If Realtor info is missing (CF Realtor Name/Phone/Email all empty):
     Move stage to "Needs a Realtor"
   Else:
     Move stage to "Actively Looking for Homes"
3) Notify LO of the stage and next steps.
```

---

### WF-PAI-02 — Realtor Added Listener (optional)
**GOAL**
```text
Build a workflow named "WF-PAI-02 — Realtor Added Listener".

Trigger: Any of the Realtor fields (CF Realtor Name/Phone/Email) becomes non-empty while in stage "Needs a Realtor".

Actions:
1) Move stage to "Actively Looking for Homes"
2) Notify LO
```

---

## UNDER CONTRACT / RESPA / DISCLOSURES / OPS WORKFLOWS

### WF-UC-01 — RESPA Trigger Router
**GOAL**
```text
Build a workflow named "WF-UC-01 — RESPA Trigger Router".

Trigger: Blend event "RESPA Triggered" (property address entered).

Actions:
1) Set CF - RESPA Triggered = true
2) Set CF - Property Address (if provided)
3) Move opportunity to pipeline "Post‑App — Under Contract / Processing"
4) Routing:
   - If CF - Loan Purpose = Refinance:
        Move stage "RESPA Triggered - Refinance (Holding)"
   - Else if Purchase and file is Pre‑Approved:
        Move stage "Under Contract - Needs Initial Disclosures"
   - Else:
        Move stage "RESPA Triggered - Not Pre-Approved (Alert)"
        Send internal alert to LO + Jason to investigate
```

---

### WF-UC-02 — Disclosures Sent Sync
**GOAL**
```text
Build a workflow named "WF-UC-02 — Disclosures Sent Sync".

Trigger: Blend event "Initial Disclosures Sent/Generated".

Actions:
1) Set CF - Initial Disclosures Sent At = now
2) Move stage to "Under Contract - Initial Disclosures Sent"
3) Notify LO (internal)
```

---

### WF-UC-03 — Disclosures Signed Sync
**GOAL**
```text
Build a workflow named "WF-UC-03 — Disclosures Signed Sync".

Trigger: Blend event "Initial Disclosures Signed".

Actions:
1) Set CF - Initial Disclosures Signed At = now
2) Move stage to "Under Contract - Initial Disclosures Signed"
3) Notify LO to complete Ops Submission Request Form
```

---

### WF-UC-04 — Ops Submission Request Form Handler → Jason Work Assignment
**GOAL**
```text
Build a workflow named "WF-UC-04 — Ops Submission Request Form Handler".

Trigger: Ops Submission Request Form submitted.

Actions:
1) Move stage to "Operations Submission - Jason Work Assignment"
2) Notify Jason + LO internally
3) Add tag "PostApp | Jason Review Needed" (reuse)
```

---

### WF-UC-05 — Jason Approval → Submitted to Ops
**GOAL**
```text
Build a workflow named "WF-UC-05 — Jason Approval → Submitted to Ops".

Trigger: Jason completes an approval action (form submission OR trigger link OR task completed).

Actions:
1) Move stage to "Submitted to Operations"
2) Remove tag "PostApp | Jason Review Needed"
3) Notify LO
```

---

### WF-UC-06 — Processing / Underwriting Stage Sync
**GOAL**
```text
Build a workflow named "WF-UC-06 — Processing / Underwriting Stage Sync".

Trigger: Blend milestone events (processing, UW submitted, UW, UW approval, clear to close).

Actions:
Move stage in order based on event:
- In Processing
- Submitted to Underwriting
- In Underwriting
- UW Approval Issued
- Clear to Close

Optional: send borrower updates at UW approval and clear to close.
```

---

### WF-UC-07 — Closed Funded → Congrats
**GOAL**
```text
Build a workflow named "WF-UC-07 — Closed Funded → Congrats".

Trigger: Blend event "Closed Funded".

Actions:
1) Move stage to "Closed Funded"
2) Add tag "Closed | Funded"
3) Send borrower congratulatory message
4) If Realtor info exists, send realtor congrats message
```

---

## NURTURE WORKFLOWS (skeleton for post-launch)

### WF-NUR-PRE-01 — Pre‑App Not Working Router
**GOAL**
```text
Build a workflow named "WF-NUR-PRE-01 — Pre‑App Not Working Router".

Trigger: Manual stage override OR CF - Not Working Reason is set while in Pre-App pipelines.

Actions:
1) Move opportunity to pipeline "Pre‑App — Not Working (Nurture)" at the matching stage.
2) Add tag "PreApp | Not Working".
3) If CF - Credit Seasoning Date exists, create a future task reminder for the LO.
```

---

### WF-NUR-POST-01 — Post‑App Not Working Router
**GOAL**
```text
Build a workflow named "WF-NUR-POST-01 — Post‑App Not Working Router".

Trigger: Credit Worthy = No OR docs never received after X days OR manual override.

Actions:
1) Move to pipeline "Post‑App — Not Working (Nurture)" at the right stage.
2) Add tag "PostApp | Not Working".
3) Stop borrower transactional messaging workflows.
```

---

### WF-NUR-02 — Credit Seasoning Follow‑Up Scheduler (optional)
**GOAL**
```text
Build a workflow named "WF-NUR-02 — Credit Seasoning Follow‑Up Scheduler".

Trigger: CF - Credit Seasoning Date is set.

Actions:
1) Create a task assigned to the LO with due date = Credit Seasoning Date.
2) Send internal reminder to LO 7 days before, 1 day before, and day of.
```

---

# 5) Manual Override System (required)
This is the “failsafe” Jason requested due to inconsistent LO CRM usage.

## Custom Field
`CF - Manual Stage Override` (Dropdown options)
- No Change
- Move to Pre-App Not Working
- Move to Post-App Not Working
- Move to Pre-Approval Issued - Needs Realtor
- Move to Pre-Approval Issued - Actively Looking
- Move to Under Contract - Needs Initial Disclosures
- Move to Closed Funded

## WF-UTIL-02 — Manual Stage Override Router
**GOAL**
```text
Build a workflow named "WF-UTIL-02 — Manual Stage Override Router".

Trigger: CF - Manual Stage Override changes and is not empty.

Actions:
1) If value = X, update the opportunity to the correct pipeline + stage.
2) Add an internal note: "Manual override used: {value}".
3) Clear CF - Manual Stage Override back to blank.
```

---

# 6) QA / Testing Plan (end-to-end)

## Pre-App
- [ ] Blend user created → opp created in Pre-App Unassigned + initial SMS
- [ ] Monitoring loop updates activity fields
- [ ] Inactivity triggers escalation
- [ ] Claim blast fires when appropriate
- [ ] Claim processor enforces first-wins lock
- [ ] SLA gate reassigns after 30 min if no engagement
- [ ] SLA engagement listener marks first touch complete + updates stage correctly
- [ ] DNC stops borrower messaging

## Post-App Working
- [ ] App complete → automated credit review runs + stores result
- [ ] Docs requested → correct stage + reminders
- [ ] Docs uploaded → pending LO pre-approval request + LO notified
- [ ] LO submits request → Jason stage + Jason notified
- [ ] Jason review routes correctly:
  - Approved → Pre-Approval Issued pipeline
  - Need More Info → Pre-Approval Wait loop
  - Declined → Post-App Not Working

## Under Contract / Ops / Closing
- [ ] RESPA triggered routes correctly (purchase/refi/not pre-approved)
- [ ] Disclosures sent/signed update stages
- [ ] Ops form submission routes to Jason work assignment
- [ ] Jason approval moves to submitted to ops
- [ ] Processing milestones move stages
- [ ] Closed funded triggers congrats

---

# 7) Progress Tracker (copy/paste)

## Foundations
- [ ] Tags created
- [ ] Custom Fields created
- [ ] Trigger Links created

## Pipelines
- [ ] Pre‑Application — Unassigned
- [ ] Pre‑Application — Assigned
- [ ] Pre‑App — Not Working (Nurture)
- [ ] Post‑App — Working — Not Yet Converted
- [ ] Post‑App — Pre‑Approval Issued
- [ ] Post‑App — Under Contract / Processing
- [ ] Post‑App — Not Working (Nurture)
- [ ] Closed / Funded (optional)

## Forms + Pages
- [ ] LO Lead Claim Form
- [ ] LO Claim Page
- [ ] LO Pre‑Approval Request Form
- [ ] Jason Review Write‑Up Form
- [ ] Ops Submission Request Form

## Workflows (Core)
- [ ] WF-LEAD-01 — Lead Intake V2
- [ ] WF-BLEND-01 — Blend Ingest + Initial SMS
- [ ] WF-BLEND-02 — Blend Monitoring Loop
- [ ] WF-BLEND-03 — Inactivity Escalation
- [ ] WF-CLAIM-01 — Application Blast
- [ ] WF-CLAIM-02 — Claim Processor
- [ ] WF-GATE-01 — SLA First Touch Gate
- [ ] WF-GATE-02 — SLA Engagement Listener
- [ ] WF-ROUTE-01 — Language Routing
- [ ] WF-UTIL-01 — DNC Handler

## Workflows (Post-App)
- [ ] WF-POST-01 — Post-App Ingest + Credit Review
- [ ] WF-POST-02 — Credit Review Micro-App
- [ ] WF-POST-03 — App Taken Router
- [ ] WF-POST-04 — Docs Requested Handler
- [ ] WF-POST-05 — Docs Reminder Cadence
- [ ] WF-POST-06 — Docs Received → Pending LO Pre‑Approval Request
- [ ] WF-POST-07 — LO Pre‑Approval Request Form Handler
- [ ] WF-POST-08 — Jason Review Write‑Up Handler
- [ ] WF-POST-09 — Pre‑Approval Wait Loop

## Workflows (Pre-Approval Issued / Under Contract)
- [ ] WF-PAI-01 — Pre‑Approval Issued Router
- [ ] WF-PAI-02 — Realtor Added Listener
- [ ] WF-UC-01 — RESPA Trigger Router
- [ ] WF-UC-02 — Disclosures Sent Sync
- [ ] WF-UC-03 — Disclosures Signed Sync
- [ ] WF-UC-04 — Ops Submission Form Handler
- [ ] WF-UC-05 — Jason Approval → Submitted to Ops
- [ ] WF-UC-06 — Processing/UW Stage Sync
- [ ] WF-UC-07 — Closed Funded → Congrats

## Manual Override + Nurture (phase 2)
- [ ] WF-UTIL-02 — Manual Stage Override Router
- [ ] WF-NUR-PRE-01 — Pre‑App Not Working Router
- [ ] WF-NUR-POST-01 — Post‑App Not Working Router
- [ ] WF-NUR-02 — Credit Seasoning Scheduler