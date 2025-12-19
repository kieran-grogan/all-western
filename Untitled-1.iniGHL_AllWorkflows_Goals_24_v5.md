# GHL Workflow GOAL Text — Full Set (24 workflows)
**Client:** All Western Mortgage (Jason Young)  
**Purpose:** Copy/paste the **GOAL** block for each workflow into **GoHighLevel → Automations → Workflow AI** so it builds the workflow correctly without guessing.  
**Source of truth:** Dec 15 + Dec 17 transcripts + your pipeline sheet + the prior build specs.

---

## Quick note (important so you don’t hit save errors again)
In GoHighLevel, **“Wait for Reply to step” requires a borrower-facing Send SMS/Email step in the same path.**  
So in the goals below, whenever we need to “wait for engagement” we use this pattern instead:

- **Wait until a tag or custom field changes** (e.g., `POSTAPP | Engaged`, or `LO First Touch Completed = Yes`)
- And we run a separate **Listener workflow** to set that tag/field when engagement happens.

This avoids the “select a communication step” error you’ve been seeing.

---

## Workflow Inventory (24)
### Blend / Pre‑App / Claim / Gate / Data
1. WF-BLEND-01 — Blend Event Ingest (User Created / App Started)  
2. WF-BLEND-02 — Blend Monitoring Loop (every 5 minutes)  
3. WF-BLEND-03 — Inactivity Branch (45 minutes)  
4. WF-CLAIM-01 — Application Blast (send claim link to all LOs)  
5. WF-CLAIM-02 — Claim Processor (first claim wins; assigns lead)  
6. WF-GATE-01 — 30-minute LO First-Touch Gate  
7. WF-GATE-02 — Mark First Touch (sets LO first-touch fields + stage)  
8. WF-LANG-01 — Spanish Routing  
9. WF-DNC-01 — DNC / STOP Handler  
10. WF-DATA-01 — Loan Amount → Opportunity Value Sync  
11. WF-LEAD-01 — Not Interested Handling  

### Post‑App — Working (Not Yet Converted)
12. WF-POSTAPP-01 — Blend “Credit Pull / App Taken” Ingest → Enter Post-App Pipeline  
13. WF-POSTAPP-02 — Route to “Application Taken” Stages (Unengaged / Engaged / Not-from-a-lead)  
14. WF-POSTAPP-03 — Application Taken Unengaged → Claim (if needed) + Watch for Engagement  
15. WF-POSTAPP-03A — Application Taken Not-from-a-lead → Auto-assign correct LO  
16. WF-POSTAPP-04 — Application Taken Engaged → Wait for Docs Requested event  
17. WF-POSTAPP-05 — Blend Docs Requested (Auto) Ingest  
18. WF-POSTAPP-06 — Docs Curated detection (if available)  
19. WF-POSTAPP-07 — Blend Docs Uploaded Ingest (Docs Received)  
20. WF-POSTAPP-10 — Docs Requested Timer (24h + 36h + 2-day cadence)  
21. WF-POSTAPP-20 — LO Pre‑Approval Request Form Submitted → Jason Queue  
22. WF-POSTAPP-30 — Jason Write‑Up Form Submitted → Decision Routing  
23. WF-POSTAPP-40 — Refinance Review Request → Jason Refi Queue  
24. WF-POSTAPP-90 — Post App Nurture Routing (not-credit-worthy OR docs-never-received)

---

# 1) Blend / Pre‑App / Claim / Gate / Data

## WF-BLEND-01 — Blend Event Ingest (User Created / App Started)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When Blend indicates a borrower started an application (Blend “user created” / “application started”), create or update the matching Contact + Opportunity in this GHL location, move them into the correct PRE-APP pipeline stage, and start the Blend monitoring + assignment logic.

TRIGGER (use ONE of these depending on your integration)
- Inbound Webhook from middleware: event = blend_user_created OR application_started
OR
- Contact Tag Added: “BLEND | App Started” (if middleware tags instead of webhooks)
OR
- Contact Custom Field Updated: “Blend App Status” changes to “in_progress”

WHAT THIS WORKFLOW MUST DO (ACTIONS IN ORDER)
1) Deduplicate / match:
   - Find or create the Contact using Blend identifiers (email/phone) and store:
     • CF: Blend Application ID
     • CF: Blend Last Activity At (timestamp)
     • CF: Blend Preferred Language (if provided)
2) Set pipeline stage (Pre‑Application – Unassigned New):
   - Update Opportunity → Pipeline = “Pre‑Application – Unassigned New”
   - Stage = “Unassigned – Application Started – Actively Completing”
   - If an opportunity already exists in Lead Intake, keep ONE and update that one (no duplicates).
3) Send the first “started app” SMS to borrower:
   - Send SMS: “I see you began your application… reply with any questions.” (exact copy can be edited)
   - Add Tag: “PREAPP | Blend Started SMS Sent”
4) Enroll into monitoring:
   - Add Tag: “BLEND | Monitor Active”
   - Add to workflow: “WF-BLEND-02 — Blend Monitoring Loop”
5) Language pre-check:
   - If CF Blend Preferred Language = Spanish (or not English), add Tag “LANG | Spanish” and add to “WF-LANG-01 — Spanish Routing”
6) Guardrails:
   - If this contact already has Tag “BLEND | App Completed” or is already in Post‑App pipeline, do nothing (exit).

DEFINITION OF DONE
- Contact is updated with Blend IDs + last activity
- Opportunity exists and is in “Pre‑Application – Unassigned New” → “Unassigned – Application Started – Actively Completing”
- Borrower received the “started app” SMS
- Monitoring is active (tag + enrolled to WF-BLEND-02)
```

---

## WF-BLEND-02 — Blend Monitoring Loop (every 5 minutes)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
While the borrower is filling the Blend application, continuously monitor for key milestones:
(A) SSN/DOB entered → trigger immediate assignment (Application Blast / Claim)
(B) No activity for 45 minutes → trigger Call Blast revival
(C) App completed / credit pulled → route to Post‑App pipeline
This monitoring must stop as soon as the file exits the pre-app stage.

TRIGGER
- Tag Added: “BLEND | Monitor Active”
OR
- Opportunity stage becomes “Unassigned – Working on Application (Blend Monitoring)”
(choose whichever you implemented in WF-BLEND-01)

IMPORTANT IMPLEMENTATION NOTE
GHL should NOT be responsible for polling Blend directly unless you already have a working webhook/action setup.
Preferred: your middleware polls Blend every 5 minutes and updates GHL custom fields:
- CF Blend Last Activity At
- CF Blend SSN Entered (Yes/No) and/or CF Blend DOB Entered (Yes/No)
- CF Blend App Completed (Yes/No)
- CF Blend Credit Pulled (Yes/No)

WHAT THIS WORKFLOW MUST DO
1) Loop every 5 minutes:
   - Wait 5 minutes
   - If Tag “BLEND | Monitor Active” is missing → stop (exit)
2) Check for completion:
   - IF CF Blend App Completed = Yes OR CF Blend Credit Pulled = Yes
     → Remove tag “BLEND | Monitor Active”
     → Add tag “BLEND | App Completed”
     → Add to workflow “WF-POSTAPP-01 — App Taken Ingest”
     → Exit
3) Check for SSN/DOB milestone (immediate assignment signal):
   - IF CF Blend SSN Entered = Yes OR CF Blend DOB Entered = Yes
     → Remove tag “BLEND | Monitor Active”
     → Add tag “BLEND | SSN/DOB Captured”
     → Add to workflow “WF-CLAIM-01 — Application Blast” (claim link)
     → Exit
4) Check inactivity threshold:
   - IF current time - CF Blend Last Activity At >= 45 minutes
     → Remove tag “BLEND | Monitor Active”
     → Add tag “BLEND | Inactive 45m”
     → Add to workflow “WF-BLEND-03 — Inactivity Branch”
     → Exit
5) Otherwise continue looping.

DEFINITION OF DONE
- Monitoring ends ONLY by one of: completion, SSN/DOB captured, or inactivity.
- Contact is routed to the correct next workflow and monitor tag removed.
```

---

## WF-BLEND-03 — Inactivity Branch (45 minutes)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When the Blend applicant goes inactive for ~45 minutes, revive the application using a Call Blast attempt.
If the call blast fails, send a fallback SMS and then leave them to be caught by your global revival/AI system later.

TRIGGER
- Tag Added: “BLEND | Inactive 45m”
OR
- Added by workflow WF-BLEND-02 when inactivity condition met

WHAT THIS WORKFLOW MUST DO
1) Move to a “not finished” visibility stage:
   - Update Opportunity → Pipeline “Pre‑Application – Unassigned New”
   - Stage = “App Started – Not Finished” (or your equivalent)
2) Trigger Call Blast Micro:
   - Add to workflow “CALLBLAST | Application Started Inactive” (your existing call blast micro)
   - OR run a call blast action sequence if you built it inside this workflow
3) If call blast unsuccessful (use your call blast workflow’s outcome tag/field):
   - Send SMS to borrower: “Tried to reach you—want help finishing the app?”
   - Add tag “BLEND | Revival SMS Sent”
4) Exit and let global AI / nurture catch future replies.

GUARDRAILS
- Do not restart Blend monitoring automatically here unless Jason specifically wants continuous monitoring after revival.
- Ensure you do not spam: if tag “BLEND | Revival SMS Sent” exists, do not send again.

DEFINITION OF DONE
- Call blast attempted
- Borrower received fallback SMS only if call blast failed
- Opportunity clearly shows “Not Finished” state
```

---

## WF-CLAIM-01 — Application Blast (send claim link to all LOs)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Notify all Loan Officers that a high-intent file is available and allow them to claim it using ONE shared link.
All LOs receive the message at the same time to ensure fairness; the claim is processed on a single claim page inside GHL.

TRIGGER
- Added by workflows when assignment is needed:
  • WF-BLEND-02 (SSN/DOB captured)
  • WF-POSTAPP-03 (post-app unassigned)
  • WF-GATE-01 (retarget after SLA failure)
OR
- Tag Added: “ASSIGN | Blast Needed”

WHAT THIS WORKFLOW MUST DO
1) Prepare claim link:
   - Use one URL to the Claim Page
   - Append contact id: ?cid={{contact.id}} (or use GHL merge field format)
2) Send INTERNAL notification to all LOs (SMS or Email):
   - Message must include:
     • Borrower name, city/state, estimated loan amount
     • Status context (e.g., “SSN captured / App started / App completed”)
     • Claim link (single shared link)
3) Add “blast sent” tracking:
   - Add tag “ASSIGN | Blast Sent”
   - Set CF “Assignment Blast Sent At” = now
4) Optional fairness controls:
   - If LO has “Recently Claimed” tag, exclude them (if you maintain a roster)
   - If reassigning, store CF “Exclude LO User ID” for claim processor to enforce

DEFINITION OF DONE
- All intended LOs were notified with the same claim link
- Contact is tagged/marked that a blast was sent (prevents duplicates)
```

---

## WF-CLAIM-02 — Claim Processor (first claim wins; assigns lead)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Process a claim submission from the LO Claim Page. The first valid claim wins:
- Assign Contact Owner and Opportunity Owner to the claiming LO
- Update the opportunity stage into the correct “Assigned” pipeline stage
- Prevent all later claims from changing ownership

TRIGGER
- Form Submitted: “LO Claim Form” (embedded on the Claim Page)
(Claim page should pass Contact ID and capture the LO’s user identity)

WHAT THIS WORKFLOW MUST DO
1) Identify claimant (LO):
   - If using sticky contact, capture LO user id/email in the form submission
   - Store claimant in:
     • CF “Assigned LO User ID”
     • CF “Assigned LO Name/Email”
2) First-claim-wins lock:
   - IF Contact Owner is already set OR CF “Assigned LO User ID” is not empty:
     → Add tag “ASSIGN | Claim Rejected – Already Assigned”
     → (Optional) Send internal notification to claimant “Already claimed”
     → Exit
3) Assign ownership:
   - Set Contact Owner = claiming LO
   - Update Opportunity Owner = claiming LO (same user)
   - Set CF “Claimed At” = now
   - Add tag “ASSIGN | Claimed”
4) Stage placement (MOST IMPORTANT):
   - If file is pre-app:
     • Pipeline = “Pre‑Application – Assigned New”
     • Stage = “Blend App Started – Unengaged” (or “SMS Engaged with AI” if borrower replied)
   - If file is post-app:
     • Pipeline = “Post App – Working – Not Yet Converted”
     • Stage = “Application Taken – Unengaged” (until engagement happens)
5) Start SLA gate:
   - Add tag “SLA | Gate Active”
   - Add to workflow “WF-GATE-01 — 30-minute LO First-Touch Gate”
6) Notify internal:
   - Send internal confirmation to claimant + ops channel (optional)

DEFINITION OF DONE
- Ownership is set to the LO
- Opportunity is in the correct Assigned pipeline stage
- SLA gate started (tag + workflow enrollment)
- Later claims cannot override assignment
```

---

## WF-GATE-01 — 30-minute LO First-Touch Gate
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Enforce LO accountability after a claim/assignment:
If a LO claims a lead but does not send a message or complete a call within 30 minutes, automatically reassign the file to another LO (exclude the current LO) and email the original LO explaining why the lead was reassigned.

TRIGGER
- Tag Added: “SLA | Gate Active”
(added by WF-CLAIM-02 or any assignment workflow)

WHAT THIS WORKFLOW MUST DO
1) Store who is currently assigned (for exclusion):
   - CF “Exclude LO User ID” = current Contact Owner/User ID
2) Wait up to 30 minutes for first touch completion:
   - Wait until CF “LO First Touch Completed” = Yes
   - Timeout = 30 minutes
3) If first touch completed (condition met):
   - Remove tag “SLA | Gate Active”
   - Add tag “SLA | Passed”
   - Exit
4) If timeout occurs (no LO engagement):
   - Add tag “SLA | Failed”
   - Update Opportunity Stage (same pipeline) → “Retargeted to New LO (Exclude Current Assignment)”
   - Trigger reassignment blast:
     • Add tag “ASSIGN | Blast Needed”
     • Add to workflow “WF-CLAIM-01 — Application Blast”
   - Email the original LO with reason:
     • Subject: “Lead Reassigned – No contact in 30 minutes”
     • Include borrower name + timestamp + what to do next

GUARDRAILS
- Do NOT fire if opportunity is already advanced to Phone Engaged, Docs Received, or later stages.
- Ensure the blast excludes the current LO (use CF Exclude LO User ID in claim processor/blast logic).

DEFINITION OF DONE
- Either SLA passed (first touch recorded) OR
- SLA failed and file was retargeted + old LO notified
```

---

## WF-GATE-02 — Mark First Touch (sets LO first-touch fields + stage)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Detect the LO’s first real engagement after a file is assigned and record it in custom fields so SLA workflows can stop.
This workflow must also advance the opportunity to the correct “LO engaged” stage (SMS vs Phone).

TRIGGERS (build as ONE workflow with multiple triggers OR as two micro workflows)
A) LO sends an outbound SMS inside GHL (message sent by assigned user to contact)
B) Call transcript generated / call completed inside GHL (connected call)

WHAT THIS WORKFLOW MUST DO (for BOTH triggers)
1) Mark first touch:
   - Update Contact:
     • CF “LO First Touch Completed” = Yes
     • CF “LO First Touch At” = now
   - Remove tag “SLA | Gate Active”
2) Update stage (depends on engagement type):
   - If trigger A (LO SMS):
     • Update Opportunity → Pipeline “Pre‑Application – Assigned New”
     • Stage = “SMS Engaged with LO” OR “Blend App Started – Engaged with LO” (use your stage naming)
   - If trigger B (call transcript/connected call):
     • Update Opportunity → same pipeline
     • Stage = “Phone Engaged with LO”
3) Idempotency:
   - If CF “LO First Touch Completed” is already Yes, do nothing (exit)

DEFINITION OF DONE
- First touch fields are set and SLA tag removed
- Opportunity stage reflects LO engagement (SMS or Phone)
```

---

## WF-LANG-01 — Spanish Routing
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Route Spanish-speaking borrowers into a Spanish-first experience:
- detect Spanish via Blend preferred language OR AI detection of Spanish messages/transcripts
- move the opportunity into “Spanish” visibility stages
- enroll the contact into a Spanish conversation workflow or assign to a Spanish-capable LO when available.

TRIGGERS
- CF “Blend Preferred Language” = Spanish
OR
- AI detected Spanish in inbound SMS (keyword detection / language detection)
OR
- Call transcript language = Spanish

WHAT THIS WORKFLOW MUST DO
1) Tag + flag:
   - Add tag “LANG | Spanish”
   - Set CF “Preferred Language” = Spanish
2) Update Opportunity for visibility:
   - If pre-app unassigned: move to stage “Spanish Speaking – No Response” (or your equivalent)
   - If engaged: move to stage “Spanish Speaking – AI Engaged/LO Call Transcript”
3) Conversation handling:
   - Add to workflow “Spanish Conversational AI — Finish Application”
   - Goal of Spanish AI: only drive them to complete Blend app / docs (no small talk)
4) Internal note:
   - Create note for LO: “Spanish-speaking borrower; use translation tools / assign Spanish LO if available.”

DEFINITION OF DONE
- Borrower is clearly labeled Spanish
- Opportunity reflects Spanish stage
- Spanish conversation workflow is running
```

---

## WF-DNC-01 — DNC / STOP Handler
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When a borrower requests STOP/DNC, immediately stop all SMS and call attempts, document the request, and send an opt-out confirmation email explaining how to re-engage.

TRIGGERS
- Customer Replied with keyword “STOP” (or any platform opt-out event)
OR
- DNC flag/label applied by system
OR
- Manual tag “DNC | Requested” added by staff

WHAT THIS WORKFLOW MUST DO
1) Compliance actions:
   - Add to DND (SMS)
   - Add to DND (Calls) for your GHL numbers (if available)
2) Tagging & logging:
   - Add tag “DNC | Confirmed”
   - Create internal note: “Customer opted out on {{date}}”
3) Opportunity stage:
   - Update Opportunity → Stage = “DNC – Specific DNC Request” (in Pre‑App pipeline) OR equivalent DNC stage
4) Email confirmation:
   - Send email: “We’ve disabled phone/text. If you want to re-engage, reply with START or email us.”
5) Remove from active outreach workflows:
   - Remove from call blast / assignment workflows if enrolled

DEFINITION OF DONE
- DND applied
- Opportunity marked DNC
- Confirmation email sent
- No future automated contact occurs unless customer re-opt-ins
```

---

## WF-DATA-01 — Loan Amount → Opportunity Value Sync
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Ensure opportunity value reflects the borrower’s requested loan amount (or purchase price) so reporting is accurate.
This fixes the Zillow/MRC mapping issue where loan amount is missing and opportunity value is blank.

TRIGGERS
- Contact Created from Zillow/MRC
OR
- Inbound Webhook received from Zillow/MRC lead
OR
- Opportunity Created in Lead Intake pipeline

WHAT THIS WORKFLOW MUST DO
1) Read incoming value:
   - From CF “Loan Amount” (preferred) OR CF “Purchase Price”
2) If value exists:
   - Update Opportunity Value = loan amount (or calculated loan amount if you have %)
   - Add tag “VALUE | Set”
3) If missing:
   - Add tag “VALUE | Missing”
   - Create internal task: “Backfill loan amount mapping for this lead”
4) (Optional) Backfill helper:
   - If you later import a CSV/backfill, rerun this workflow via tag “VALUE | Backfill”

DEFINITION OF DONE
- Opportunity value is populated whenever loan amount data is available
- Missing values are clearly tagged for cleanup
```

---

## WF-LEAD-01 — Not Interested Handling (recommended)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When a prospect replies indicating they are not interested / wrong inquiry, stop active outreach politely, mark the opportunity as “Not Interested,” and preserve the ability to re-engage later if they initiate contact.

TRIGGER
- Inbound SMS analyzed as “Not interested” intent (keywords like “not interested”, “stop contacting”, “wrong person”)
(Use your AI intent router OR a keyword condition)

WHAT THIS WORKFLOW MUST DO
1) Update opportunity:
   - Pipeline = Pre‑Application – Unassigned New (or Lead Intake pipeline)
   - Stage = “Not Interested”
2) Send one final polite message (optional if not DNC):
   - “Thanks — if anything changes, reply here.”
3) Tagging:
   - Add tag “LEAD | Not Interested”
4) Remove from active outreach workflows:
   - Remove from lead intake follow-ups / call blasts if enrolled

DEFINITION OF DONE
- Opportunity clearly labeled Not Interested
- Outreach stopped (unless they re-initiate)
```

---

# 2) Post‑App — Working (Not Yet Converted)

## WF-POSTAPP-01 — Blend “Credit Pull / App Taken” Ingest → Enter Post-App Pipeline
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When Blend indicates a file has reached “application taken” status (credit pulled OR SSN/DOB captured OR app completed), move the record into the Post‑App pipeline and start automated credit review + routing.

TRIGGERS
- Inbound Webhook: credit_pulled OR ssn_captured OR application_completed
OR
- Tag Added: “BLEND | App Taken”
OR
- CF “Blend Credit Pulled” becomes Yes

WHAT THIS WORKFLOW MUST DO
1) Normalize stage/pipeline:
   - Update Opportunity → Pipeline = “Post App – Working – Not Yet Converted”
   - Stage = “Automated Credit Review”
2) Store status:
   - Add tag “POSTAPP | App Taken”
   - Set CF “PostApp Started At” = now
3) Kick off credit review mini-app (if implemented):
   - Webhook to middleware/AI: send credit metadata / application id
   - Store returned summary fields:
     • CF “Credit Summary”
     • CF “Credit Worthy” (Yes/No/Review)
4) Route into the correct “Application Taken” stage:
   - Add to workflow “WF-POSTAPP-02 — Route to Application Taken Stages”

DEFINITION OF DONE
- Opportunity is in Post-App pipeline at Automated Credit Review
- Credit review initiated (or skipped with note)
- Routed to stage router workflow
```

---

## WF-POSTAPP-02 — Route to “Application Taken” Stages (Unengaged / Engaged / Not-from-a-lead)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Decide which “Application Taken” path this file belongs to:
(A) Not-from-a-lead (referral/LO-generated) → auto-assign to that LO
(B) Engaged → move to Engaged path + docs tracking
(C) Unengaged → claim/watch path + assignment if missing

TRIGGER
- Added by WF-POSTAPP-01 after credit/app-taken ingest
OR
- Opportunity stage becomes “Automated Credit Review”

WHAT THIS WORKFLOW MUST DO
1) Determine source / intended LO:
   - If CF “Blend Originator Email/UserID” exists → Not-from-a-lead path
2) Determine engagement state:
   - If borrower has replied OR call transcript exists OR tag “POSTAPP | Engaged” exists → Engaged path
   - Else → Unengaged path
3) Route:
   - Not-from-a-lead:
     • Update Opportunity Stage = “Application Taken – Not from a Lead”
     • Add to workflow “WF-POSTAPP-03A — Not-from-a-lead Auto-assign”
   - Engaged:
     • Update Opportunity Stage = “Application Taken – Engaged”
     • Add to workflow “WF-POSTAPP-04 — Engaged → Wait for Docs”
   - Unengaged:
     • Update Opportunity Stage = “Application Taken – Unengaged”
     • Add to workflow “WF-POSTAPP-03 — Unengaged Claim + Watch”

DEFINITION OF DONE
- Opportunity is in exactly one of the three stages
- Correct downstream workflow started
```

---

## WF-POSTAPP-03 — Application Taken Unengaged → Claim (if needed) + Watch for Engagement
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
For post-app files where the borrower has not engaged (no reply, no connected call):
- Ensure the file is assigned to a LO (blast claim if unassigned)
- Monitor for engagement for up to 7 days
- If engagement happens, advance to Engaged + start docs workflow
- If no engagement, tag for reporting and/or route to nurture

TRIGGER
- Opportunity enters stage “Application Taken – Unengaged” in pipeline “Post App – Working – Not Yet Converted”
OR
- Added by WF-POSTAPP-02

WHAT THIS WORKFLOW MUST DO
1) Assignment check:
   - If Contact Owner is empty:
     • Add tag “ASSIGN | Blast Needed”
     • Add to workflow “WF-CLAIM-01 — Application Blast”
   - Else continue
2) Watch for engagement WITHOUT using “wait for reply to step”:
   - Wait until tag “POSTAPP | Engaged” exists OR call transcript exists
   - Timeout = 7 days
3) If engagement occurs:
   - Update Opportunity Stage = “Application Taken – Engaged”
   - Add to workflow “WF-POSTAPP-04 — Engaged → Wait for Docs”
4) If timeout occurs:
   - Add tag “POSTAPP | Still Unengaged”
   - (Optional) Move to nurture stage/pipeline when defined

IMPORTANT NOTE
Create/enable the listener workflow (below) that sets tag “POSTAPP | Engaged” whenever the borrower replies or a connected call happens.

DEFINITION OF DONE
- Either file advances to Engaged and docs workflow starts
- OR it is tagged Still Unengaged for nurture/reporting
```

---

## WF-POSTAPP-03A — Application Taken Not-from-a-lead → Auto-assign correct LO
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
For referral / LO-generated applications (not from a paid lead source), auto-assign the file to the correct Loan Officer using Blend originator data and skip the public claim blast. Then place the file into the standard Engaged path for docs.

TRIGGER
- Opportunity enters stage “Application Taken – Not from a Lead” (Post App pipeline)
OR
- Added by WF-POSTAPP-02

WHAT THIS WORKFLOW MUST DO
1) Identify intended LO:
   - Read CF “Blend Originator Email” or CF “Blend Originator UserID”
2) Assign Contact Owner:
   - Preferred: Webhook to middleware that maps originator email → GHL user id → sets Contact Owner
   - If mapping is simple, you may use IF originator email = X THEN Assign to User X
3) Skip AI if policy requires:
   - Add tag “AI | Skip” OR remove from AI conversation workflows
4) Normalize into Engaged state:
   - Add tag “POSTAPP | Engaged”
   - Update Opportunity Stage = “Application Taken – Engaged”
   - Add to workflow “WF-POSTAPP-04 — Engaged → Wait for Docs”
5) If LO identification is missing:
   - Fallback to claim blast:
     • Add tag “ASSIGN | Blast Needed”
     • Add to workflow “WF-CLAIM-01 — Application Blast”

DEFINITION OF DONE
- Correct LO is assigned and file moved to Engaged + docs workflow started
OR
- Fallback blast triggered with internal tracking
```

---

## WF-POSTAPP-04 — Application Taken Engaged → Wait for Docs Requested event (or force doc request tracking)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Once the borrower is engaged and the file is “Application Taken – Engaged”, track the documentation lifecycle:
- Detect when Blend requests docs (auto or curated)
- Start the docs timer workflow

TRIGGER
- Opportunity enters stage “Application Taken – Engaged” (Post App pipeline)

WHAT THIS WORKFLOW MUST DO
1) If docs request already recorded:
   - If tag “DOCS | Requested” exists OR CF “Docs Requested At” is not empty:
     • Update stage to “Borrower Docs Requested – Auto” (or Curated)
     • Add to workflow “WF-POSTAPP-10 — Docs Timer”
     • Exit
2) Otherwise wait for docs requested signal:
   - Wait until tag “DOCS | Requested” exists
   - Timeout = 24 hours
3) If docs requested appears:
   - Update stage accordingly
   - Start docs timer workflow
4) If timeout occurs without docs requested:
   - Create internal task for assigned LO: “Check Blend — confirm docs were requested”
   - Keep stage as Engaged

DEFINITION OF DONE
- Docs requested is detected and docs timer started OR LO tasked to verify if signal missing
```

---

## WF-POSTAPP-05 — Blend Docs Requested (Auto) Ingest
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When Blend automatically generates a borrower document request, stamp the file as “Docs Requested,” move the opportunity into the correct stage, notify the LO, and start the docs follow-up timer.

TRIGGER (preferred)
- Inbound Webhook from middleware: event = documentation.created (Blend)
OR
- Tag Added: “DOCS | Requested” (if middleware tags)

WHAT THIS WORKFLOW MUST DO
1) Update tracking:
   - Set CF “Docs Requested At” = now
   - Add tag “DOCS | Requested”
2) Move stage:
   - Pipeline = Post App – Working – Not Yet Converted
   - Stage = “Borrower Docs Requested – Auto”
3) Notify LO internally:
   - Internal email/SMS: “Docs requested — watch for uploads”
4) Start docs timer:
   - Add to workflow “WF-POSTAPP-10 — Docs Requested Timer”

DEFINITION OF DONE
- Docs Requested is recorded + stage updated + timer running
```

---

## WF-POSTAPP-06 — (If available) Docs Curated detection
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
If Blend can indicate that a LO curated/added custom documentation requests (beyond auto-generated), mark that as LO engagement and move the file into a “Docs Requested – Curated” stage for reporting.

TRIGGER
- Inbound Webhook: documentation.updated / curated_request_created (if available)
OR
- Tag Added: “DOCS | Curated” (middleware decision)

WHAT THIS WORKFLOW MUST DO
1) Add tag “DOCS | Curated”
2) Update Opportunity Stage = “Borrower Docs Requested – Curated (if available)”
3) Internal note: “LO curated doc request in Blend”

DEFINITION OF DONE
- File is clearly labeled as curated docs request for analytics
```

---

## WF-POSTAPP-07 — Blend Docs Uploaded Ingest (Docs Received)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When the borrower uploads documentation in Blend, stop follow-up timers, mark docs received, and move the file into the LO pre-approval request queue.

TRIGGER
- Inbound Webhook: documentation.uploaded / file.available / document.exported (Blend)
OR
- Tag Added: “DOCS | Received”

WHAT THIS WORKFLOW MUST DO
1) Tracking:
   - Set CF “Docs Received At” = now
   - Add tag “DOCS | Received”
2) Stop reminders:
   - Remove from workflow “WF-POSTAPP-10 — Docs Timer” (or set a stop tag that the timer checks)
3) Move stage forward:
   - Stage = “Borrower Docs Received”
   - Then Stage = “Pending LO Pre‑Approval Request”
4) Notify LO + task:
   - Create task for assigned LO: “Complete LO Pre‑Approval Request Form”
   - Internal email/SMS to LO with link to contact + checklist

DEFINITION OF DONE
- Docs received recorded, reminders stopped, and file is queued for LO pre-approval request
```

---

## WF-POSTAPP-10 — Docs Requested Timer (24h + 36h + 2-day cadence)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Automate borrower follow-ups after docs are requested:
- 24h gentle reminder
- 36h escalation + stage “Not received after 36 hours”
- then a reminder every 2 days for a defined window
Stop instantly when docs are received.

TRIGGER
- Added by WF-POSTAPP-05 when docs requested
OR
- Tag Added: “DOCS | Requested”

WHAT THIS WORKFLOW MUST DO
1) Guard: if tag “DOCS | Received” exists, exit immediately
2) Wait 24 hours:
   - If docs received → exit
   - Else send borrower message: “Any questions on the requested documents?”
   - Internal note to LO (optional)
3) Wait until 36 hours total since request:
   - If docs received → exit
   - Else:
     • Update Opportunity Stage = “Borrower Docs Requested – Not received after 36 hours”
     • Send borrower message: “We’re putting your file on hold until docs are uploaded…”
     • Send internal notification to LO
4) Ongoing cadence:
   - Every 48 hours:
     • If docs received → exit
     • Else send reminder (gentle)
   - Stop after N days (e.g., 14 days) and route:
     • Add tag “DOCS | Never Received”
     • Add to workflow “WF-POSTAPP-90 — Nurture Routing”
     • Exit

IMPORTANT GHL NOTE
Do NOT use “Wait for Reply to step.” Use time waits + checks for tag “DOCS | Received”.

DEFINITION OF DONE
- Either docs received stops the timer OR it routes to nurture after max duration
```

---

## WF-POSTAPP-20 — LO Pre‑Approval Request Form Submitted → Jason Queue
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Create a standardized, trackable process for Loan Officers to request Jason’s pre-approval review:
When LO submits the Pre‑Approval Request (Checklist) form, move the opportunity into Jason’s work queue, create a task for Jason, and send him an internal email containing the LO’s completed checklist + key borrower identifiers.

TRIGGER
- Form Submitted: “LO Pre‑Approval Request (Checklist)”

WHAT THIS WORKFLOW MUST DO
1) Stamp request:
   - Set CF “Pre‑Approval Request Submitted At” = now
   - Add tag “PREAPPROVAL | Requested”
2) Move to Jason queue:
   - Pipeline = Post App – Working – Not Yet Converted
   - Stage = “Pre‑Approval Review – Jason Work Assignment”
3) Create Jason task:
   - Title: “Pre‑Approval Review Needed: {{contact.name}}”
   - Due: same day or +24h
4) Email Jason:
   - Include:
     • Contact link
     • Opportunity link/pipeline stage
     • Assigned LO name
     • All checklist fields (merge fields)
5) Optional: notify LO confirmation

DEFINITION OF DONE
- Opportunity is in Jason’s stage + Jason has task + email with checklist details
```

---

## WF-POSTAPP-30 — Jason Write‑Up Form Submitted → Decision Routing
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When Jason completes the Pre‑Approval Review (Write‑Up) form, route the file:
- Approved → move to Post App – Pre‑Approval Issued pipeline/stage
- Needs More Info → move to “Pre‑Approval Wait – LO Work Assignment” and notify LO of missing items
- Declined/Not credit worthy → route to nurture/decline path

TRIGGER
- Form Submitted: “Jason Pre‑Approval Review (Write‑Up)”

WHAT THIS WORKFLOW MUST DO
1) Stamp Jason review:
   - Set CF “Jason Review Completed At” = now
   - Add tag “PREAPPROVAL | Jason Reviewed”
2) Read decision field from Jason’s form:
   - Decision = Approved / Needs More Info / Declined
3) Branch routing:
   A) Approved:
      - Update Opportunity → Pipeline “Post App – Pre‑Approval Issued”
      - Stage = “Pre‑Approval Issued” (or your approved stage)
      - Notify LO internally with Jason write-up summary
   B) Needs More Info:
      - Update Opportunity → Pipeline “Post App – Working – Not Yet Converted”
      - Stage = “Pre‑Approval Wait – LO Work Assignment”
      - Create LO task with missing items
      - Email LO with Jason’s notes (merge fields)
   C) Declined / Not credit worthy:
      - Add tag “PREAPPROVAL | Declined”
      - Add to workflow “WF-POSTAPP-90 — Nurture Routing”
      - Notify LO internally
4) Guardrails:
   - If already moved to approved pipeline, do nothing

DEFINITION OF DONE
- File is routed to the correct next stage/pipeline and the responsible party has tasks/notifications
```

---

## WF-POSTAPP-40 — Refinance Review Request → Jason Refi Queue
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
When a file requires refinance review, place it into a dedicated refinance work queue for Jason with standardized internal notifications.

TRIGGERS (pick one)
- Opportunity enters stage “Refinance Review Requested”
OR
- Tag Added: “REFI | Review Requested”
OR
- Form Submitted: “Refi Review Request” (if you create a form)

WHAT THIS WORKFLOW MUST DO
1) Update stage:
   - Pipeline = Post App – Working – Not Yet Converted (or a Refi pipeline)
   - Stage = “Refinance Review – Jason Work Assignment”
2) Create Jason task:
   - Title: “Refi Review Needed: {{contact.name}}”
3) Email Jason with:
   - Contact/opportunity link + LO notes + refinance context

DEFINITION OF DONE
- Jason has a clear refi queue item + task + email context
```

---

## WF-POSTAPP-90 — Placeholder: Post App Nurture Routing (not-credit-worthy OR docs-never-received)
### GOAL (copy/paste into Workflow AI)
```text
PURPOSE
Ensure post-app files do not disappear into “nowhere land.”
Route files into the correct nurture buckets based on why they stalled:
- Not credit worthy (dead on arrival)
- Viable loan but docs never received
- Long-term hold / customer ghosted
This workflow should apply tags/stages and enroll the contact in the right nurture micro-workflow.

TRIGGERS
- Tag Added: “DOCS | Never Received”
OR
- Tag Added: “CREDIT | Not Worthy”
OR
- Manual disposition field updated by LO (e.g., “Customer ghosted”)

WHAT THIS WORKFLOW MUST DO
1) Determine reason:
   - If CREDIT not worthy → add tag “NURTURE | Credit Improvement” and move to that nurture stage
   - If DOCS never received → add tag “NURTURE | Docs Never Received” and move to that stage
   - If LO disposition = ghosted → add tag “NURTURE | Ghosted” and move accordingly
2) Move opportunity into the nurture pipeline/stage Jason defined:
   - Example stage: “Application Taken – Viable Loan – Documentation Never Received”
3) Enroll in the correct nurture micro-workflow:
   - Credit improvement sequence
   - Docs reminder long-term sequence
   - Re-engagement sequence
4) Internal logging:
   - Create note for reporting and future reactivation

DEFINITION OF DONE
- File is categorized, moved to the correct nurture stage, and an appropriate nurture sequence is running
```

---

# End
