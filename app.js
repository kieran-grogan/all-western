// Data structures from the build spec
const customFields = {
    'A': {
        title: 'Claim / Assignment Control',
        fields: [
            { name: 'CF – Claim Status', type: 'Single line text', values: 'unclaimed, claimed' },
            { name: 'CF – Claimed At', type: 'Date & Time' },
            { name: 'CF – Claimed By User ID', type: 'Single line text' },
            { name: 'CF – Claimed By Name', type: 'Single line text' },
            { name: 'CF – Claimed By Email', type: 'Single line text' },
            { name: 'CF – Excluded User ID', type: 'Single line text', note: 'Used after reassignment' },
            { name: 'CF – LO First Touch Completed', type: 'Yes/No' },
            { name: 'CF – LO First Touch At', type: 'Date & Time' }
        ]
    },
    'B': {
        title: 'Blend Monitoring Fields',
        fields: [
            { name: 'CF – Blend App ID', type: 'Single line text' },
            { name: 'CF – Blend Status', type: 'Single line text', values: 'started/in_progress/completed' },
            { name: 'CF – Blend Last Activity At', type: 'Date & Time' },
            { name: 'CF – Blend SSN Entered', type: 'Yes/No' },
            { name: 'CF – Blend DOB Entered', type: 'Yes/No' },
            { name: 'CF – Blend Progress %', type: 'Number' },
            { name: 'CF – Preferred Language', type: 'Dropdown', values: 'English / Spanish / Other / Unknown' }
        ]
    },
    'C': {
        title: 'Lead Value Tracking',
        fields: [
            { name: 'CF – Loan Amount', type: 'Currency or Number' },
            { name: 'CF – Purchase Price', type: 'Currency or Number', optional: true }
        ]
    },
    'D': {
        title: 'Blend Identifiers / State (Post-App)',
        fields: [
            { name: 'CF – Blend Application ID', type: 'Single line text' },
            { name: 'CF – Blend Last Event Type', type: 'Single line text' },
            { name: 'CF – Blend Credit Pulled', type: 'Checkbox' },
            { name: 'CF – Blend SSN Entered', type: 'Checkbox' },
            { name: 'CF – Blend App Status', type: 'Dropdown', values: 'started, in_progress, completed, archived, unknown' },
            { name: 'CF – Preferred Language (Blend)', type: 'Dropdown', values: 'English, Spanish, Other, Unknown' }
        ]
    },
    'E': {
        title: 'Credit Review / Decisioning',
        fields: [
            { name: 'CF – Credit Review Status', type: 'Dropdown', values: 'pending, complete, failed' },
            { name: 'CF – Credit Worthy', type: 'Dropdown', values: 'yes, no, unknown' },
            { name: 'CF – Credit Summary (AI)', type: 'Multi-line text' },
            { name: 'CF – Credit Review Timestamp', type: 'Date & Time' }
        ]
    },
    'F': {
        title: 'Documentation Tracking',
        fields: [
            { name: 'CF – Docs Requested Timestamp', type: 'Date & Time' },
            { name: 'CF – Docs Received Timestamp', type: 'Date & Time' },
            { name: 'CF – Docs Followup Stage', type: 'Dropdown', values: 'none, 24h_sent, 36h_sent, 2day_cadence, closed_out' },
            { name: 'CF – Docs Last Followup Timestamp', type: 'Date & Time' }
        ]
    },
    'G': {
        title: 'Pre-Approval Workflow Tracking',
        fields: [
            { name: 'CF – PreApproval LO Request Status', type: 'Dropdown', values: 'not_started, in_progress, submitted' },
            { name: 'CF – PreApproval LO Request Timestamp', type: 'Date & Time' },
            { name: 'CF – PreApproval Jason Review Status', type: 'Dropdown', values: 'not_started, in_review, needs_more_info, approved, declined' },
            { name: 'CF – PreApproval Jason Review Timestamp', type: 'Date & Time' }
        ]
    },
    'H': {
        title: 'Routing / Ownership Helpers',
        fields: [
            { name: 'CF – Source Type', type: 'Dropdown', values: 'lead, not_from_lead, unknown' },
            { name: 'CF – LO User ID (Assigned)', type: 'Single line text' },
            { name: 'CF – LO Email (Assigned)', type: 'Single line text' }
        ]
    }
};

const tags = [
    'BLEND | App Started',
    'BLEND | Monitoring Active',
    'BLEND | Inactive 45m',
    'ASSIGNMENT | Needs LO',
    'ASSIGNMENT | Claimed',
    'SLA | Gate Active',
    'LANG | Spanish',
    'DNC | Requested',
    'DATA | Missing Loan Amount',
    'POSTAPP | Entered',
    'POSTAPP | Credit Review Pending',
    'POSTAPP | Credit Review Complete',
    'POSTAPP | Credit Worthy - Yes',
    'POSTAPP | Credit Worthy - No',
    'DOCS | Requested',
    'DOCS | Received',
    'DOCS | Followup 24h',
    'DOCS | Followup 36h',
    'DOCS | Nurture',
    'PREAPPROVAL | LO Request Pending',
    'PREAPPROVAL | LO Request Submitted',
    'PREAPPROVAL | Jason Review Pending',
    'PREAPPROVAL | Jason Needs More Info',
    'PREAPPROVAL | Approved',
    'PREAPPROVAL | Declined',
    'REFI | Review Requested'
];

const claimPageSteps = [
    {
        id: 'claim-page',
        title: 'Create Claim Page',
        description: 'Path: Sites → Funnels (or Websites) → + New → Page<br>Page name: Claim Lead<br>Path: /claim<br>Show lead name, city/state, loan amount, and Blend progress via URL query parameters'
    },
    {
        id: 'claim-form',
        title: 'Create Claim Form',
        description: 'Path: Sites → Forms → + New Form<br>Name: FORM – LO Claim Lead<br>Fields: LO Name, LO Email, LO User ID (dropdown), Lead Key (hidden), Opportunity ID (hidden)<br>On submit → redirect to /claim-success'
    },
    {
        id: 'claim-success',
        title: 'Create Claim Success Page',
        description: 'Create /claim-success page with message: "✅ Claim submitted. If you were first, the lead is now assigned to you."'
    }
];

const workflows = {
    'Blend Integration': {
        title: 'Blend Integration',
        items: [
            {
                id: 'blend-ingest',
                name: 'Blend Event Ingest',
                detailedGoal: `PURPOSE
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
- Monitoring is active (tag + enrolled to WF-BLEND-02)`,
                subtitle: 'User Created / App Started',
                goal: 'When Blend emits "user created/app started", create/update the Contact + Opportunity, push them into the Blend pre-app path, send the initial SMS, and start monitoring.',
                trigger: 'Inbound Webhook (recommended) from middleware with Blend payload OR internal Blend integration trigger',
                inputs: ['email and/or phone', 'Blend App ID', 'preferred language (if provided)', 'progress percent/stage (if provided)', 'loan amount (if provided)'],
                steps: [
                    'Action: Find/Create Contact (if trigger doesn\'t target contact)',
                    'Action: Update Contact Fields (CF – Blend App ID, Status, Progress %, Preferred Language, Loan Amount)',
                    'Action: Create/Update Opportunity (Pipeline: Pre-Application – Unassigned New, Stage: Unassigned – Application Started – Actively Completing)',
                    'Action: Add Tag "BLEND | App Started"',
                    'Action: Send SMS to Lead',
                    'Action: Add to Workflow "Blend Monitoring Loop"'
                ],
                exitCriteria: [
                    'Contact exists with Blend fields set',
                    'Opportunity exists in Unassigned pipeline at "Actively Completing"',
                    'Monitoring workflow started'
                ],
                testCases: [
                    'Blend start event creates contact and opportunity',
                    'Stage set correctly',
                    'SMS sent once (no duplicates)'
                ]
            },
            {
                id: 'blend-monitor',
                name: 'Blend Monitoring Loop',
                detailedGoal: `PURPOSE
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
- Contact is routed to the correct next workflow and monitor tag removed.`,
                subtitle: 'Every 5 minutes',
                goal: 'Poll for progress and route: SSN/DOB entered → assignment blast immediately; inactivity ≥45m → call blast',
                trigger: 'Added to Workflow from "Blend Event Ingest"',
                steps: [
                    'Action: Update Opportunity Stage to "Unassigned – Working on Application (Blend Monitoring)"',
                    'Action: Add Tag "BLEND | Monitoring Active"',
                    'Loop block (repeat):',
                    '  • Wait 5 minutes',
                    '  • Action: Webhook (Outbound) → "Check Blend Status" (updates Last Activity, SSN Entered, DOB Entered, Progress %, Status)',
                    '  • IF/ELSE: SSN/DOB entered → Remove tag, stop loop, Add to "Application Blast"',
                    '  • IF/ELSE: Inactive ≥45 minutes → Remove tag, stop loop, Add to "Blend Inactivity Branch"'
                ],
                exitCriteria: [
                    'Monitoring stops when assignment blast fires, or',
                    'inactivity branch fires, or',
                    'app completes (optional extension)'
                ],
                testCases: [
                    'Lead hits monitoring stage immediately',
                    'After SSN entered → blast triggers within one polling cycle',
                    'After 45 mins inactivity → call blast triggers'
                ]
            },
            {
                id: 'blend-inactivity',
                name: 'Blend Inactivity Branch',
                detailedGoal: `PURPOSE
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
- Opportunity clearly shows “Not Finished” state`,
                subtitle: '45 minutes',
                goal: 'Revive stalled app: call blast, if unsuccessful → SMS follow-up, then return to general revival pool',
                trigger: 'Added to workflow from "Blend Monitoring Loop" inactivity branch',
                steps: [
                    'Action: Update Opportunity Stage to "Unassigned – Application Started – Not Finished"',
                    'Action: (Optional) Add Note "Blend inactive ≥45m → initiating call blast"',
                    'Action: Start Call Blast sequence (Attempt 1: call lead, If no answer: Attempt 2 optional, After attempts: Send SMS)',
                    'Action: Routing after blast (if lead replies later, push back into assignment flow or AI engagement)'
                ],
                exitCriteria: [
                    'Call blast executed and follow-up SMS sent if needed'
                ],
                testCases: [
                    'Inactivity triggers branch and stops monitoring loop',
                    'SMS follow-up sent only after failed call attempts'
                ]
            }
        ]
    },
    'Claim & Assignment': {
        title: 'Claim & Assignment',
        items: [
            {
                id: 'claim-blast',
                name: 'Application Blast',
                detailedGoal: `PURPOSE
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
- Contact is tagged/marked that a blast was sent (prevents duplicates)`,
                subtitle: 'Send claim link to all LOs',
                goal: 'Send a single message to all LOs with one claim link so everyone has equal response time and can see lead context before claiming.',
                trigger: 'Added to workflow from "Blend Monitoring Loop" (SSN/DOB entered) OR from other flows',
                steps: [
                    'Action: Update Opportunity Stage to "Unassigned – Engaged – Awaiting Assignment"',
                    'Action: Set claim fields (CF – Claim Status = unclaimed, reset claimed fields)',
                    'Action: Add Tag "ASSIGNMENT | Needs LO"',
                    'Action: Internal Notification (SMS) → Team "Loan Officers" (include claim URL + context)',
                    'Action: (Optional) Admin notification'
                ],
                exitCriteria: [
                    'Blast sent once',
                    'Lead now sits in "Awaiting Assignment" stage until claimed'
                ],
                testCases: [
                    'Blast arrives to all LOs',
                    'Link opens and shows lead context',
                    'Form submits successfully'
                ]
            },
            {
                id: 'claim-processor',
                name: 'Claim Processor',
                detailedGoal: `PURPOSE
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
- Later claims cannot override assignment`,
                subtitle: 'First claim wins; assigns lead',
                goal: 'Process claim submissions and award lead to the first claimant only. Move to Assigned pipeline and start the 30-min gate.',
                trigger: 'Form Submitted (FORM – LO Claim Lead) OR Inbound Webhook',
                steps: [
                    'Guardrail 1: Deny excluded LO (IF Excluded User ID = form LO User ID → deny and email LO)',
                    'Guardrail 2: First claim wins (IF Claim Status = claimed → deny and notify)',
                    'Award branch (unclaimed):',
                    '  • Action: Update Contact Fields (LOCK FIRST: Claim Status = claimed, Claimed At = now, Claimed By fields)',
                    '  • Action: Assign Contact Owner (LO User ID, Only assign if unassigned toggle)',
                    '  • Action: Update Opportunity (Pipeline: Pre-Application – Assigned New, Stage: Blend App Started – Unengaged, Owner: LO User ID)',
                    '  • Action: Remove tag "ASSIGNMENT | Needs LO", Add tag "ASSIGNMENT | Claimed"',
                    '  • Action: Create Task "FIRST TOUCH REQUIRED (30 MIN SLA)"',
                    '  • Action: Add tag "SLA | Gate Active"',
                    '  • Action: Add to Workflow "30-minute LO First-Touch Gate"',
                    '  • Action: Internal Notification to claiming LO'
                ],
                exitCriteria: [
                    'Contact + opportunity assigned to LO',
                    'Opportunity moved to assigned pipeline',
                    'SLA task created + gate started'
                ],
                testCases: [
                    'Two LOs submit: first gets awarded; second gets denial message',
                    'Excluded LO cannot reclaim after reassignment'
                ]
            },
            {
                id: 'gate-sla',
                name: '30-minute LO First-Touch Gate',
                detailedGoal: `PURPOSE
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
- SLA failed and file was retargeted + old LO notified`,
                subtitle: 'LO accountability check',
                goal: 'If LO does not engage within 30 minutes after claiming, reassign and notify them why.',
                trigger: 'Tag Added: "SLA | Gate Active" (Added at end of Claim Processor)',
                steps: [
                    'Set baseline fields (CF – LO First Touch Completed = No, CF – LO First Touch At = blank)',
                    'Wait 30 minutes',
                    'IF/ELSE: First Touch Completed',
                    '  • YES → End',
                    '  • NO → Reassignment branch:',
                    '    - Action: Capture exclusion (CF – Excluded User ID = current Contact Owner)',
                    '    - Action: Email previous LO',
                    '    - Action: Reset claim lock (CF – Claim Status = unclaimed, clear claimed fields, update tags)',
                    '    - Action: Update Opportunity Stage to "Retargeted to New LO"',
                    '    - Action: Add to Workflow "Application Blast" (reblast)'
                ],
                exitCriteria: [
                    'If touched: gate ends',
                    'If not touched: lead reblasts and excluded LO is recorded'
                ],
                testCases: [
                    'LO claims, does nothing → lead gets reblasted at 30 minutes and LO receives email',
                    'Exclusion prevents immediate reclaim'
                ]
            },
            {
                id: 'gate-mark-touch',
                name: 'Mark First Touch',
                detailedGoal: `PURPOSE
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
- Opportunity stage reflects LO engagement (SMS or Phone)`,
                subtitle: 'How to set "LO First Touch Completed"',
                goal: 'When LO actually engages (message or real call), mark first touch complete and move stages for analytics.',
                trigger: 'Task Completed (task title contains "FIRST TOUCH REQUIRED") OR Transcript Generated',
                steps: [
                    'Trigger: Task Completed OR Transcript Generated',
                    'Actions:',
                    '  • CF – LO First Touch Completed = Yes',
                    '  • CF – LO First Touch At = now',
                    '  • Remove tag "SLA | Gate Active"',
                    '  • Update Opportunity Stage (If SMS → "Blend App Started – Engaged with LO", If call → "Phone Engaged with LO")'
                ],
                exitCriteria: [
                    'LO First Touch fields updated and gate can end naturally'
                ],
                testCases: [
                    'Completing SLA task stops reassignment',
                    'Call transcript stops reassignment'
                ]
            }
        ]
    },
    'Post-App (Ingest & Routing)': {
        title: 'Post-App (Ingest & Routing)',
        items: [
            {
                id: 'postapp-ingest',
                name: 'Blend Credit Pull / App Taken Ingest',
                detailedGoal: `PURPOSE
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
- Routed to stage router workflow`,
                subtitle: 'Enter Post-App Pipeline',
                goal: 'When Blend indicates credit pulled or app taken, move to Post-App pipeline, trigger credit review, and stop old workflows.',
                trigger: 'Incoming Webhook (event_type = credit_pulled) OR Tag Added "BLEND | Credit Pulled"',
                steps: [
                    'Guardrail: If tag "POSTAPP | Entered" exists → Stop',
                    'Set tracking: Add tags "POSTAPP | Entered", "POSTAPP | Credit Review Pending"; Set CF – Credit Review Status = pending',
                    'Create/Update Opportunity: Pipeline "Post App – Working – Not Yet Converted", Stage "Automated Credit Review"',
                    'Stop old workflows: Remove from Lead Intake / Pre-App monitoring',
                    'Trigger credit review mini-app: Webhook (outbound)',
                    'Wait for completion: Wait until CF – Credit Review Status = complete (Timeout: 10m)',
                    'Route based on Credit Worthy: If Yes → "Route to Application Taken Stages"; If No → Nurture'
                ],
                exitCriteria: [
                    'Opportunity in Post-App pipeline',
                    'Credit review triggered and result processed'
                ],
                testCases: [
                    'Credit pull event triggers workflow',
                    'Duplicate events rejected',
                    'Credit worthy Yes/No routing works'
                ]
            },
            {
                id: 'postapp-router',
                name: 'Route to "Application Taken" Stages',
                detailedGoal: `PURPOSE
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
- Correct downstream workflow started`,
                subtitle: 'Unengaged / Engaged / Not-from-a-lead',
                goal: 'Route the opportunity to the correct stage based on source type and engagement history.',
                trigger: 'Child workflow started by "Blend Credit Pull / App Taken Ingest" OR Blend "app completed" webhook',
                steps: [
                    'Determine Source Type: If "not_from_lead" → Stage "Application Taken - Not from a Lead", Add to "Not-from-a-lead Auto-assign"',
                    'Determine Engagement State: If inbound SMS/call/reply exists → Stage "Application Taken - Engaged", Add to "Engaged -> Wait for Docs"',
                    'Else → Stage "Application Taken - Unengaged", Add to "Unengaged Claim + Watch"'
                ],
                exitCriteria: [
                    'Opportunity moved to correct Application Taken stage',
                    'Next workflow started'
                ],
                testCases: [
                    'Not-from-lead routing',
                    'Engaged vs Unengaged routing'
                ]
            },
            {
                id: 'postapp-unengaged',
                name: 'Unengaged Claim + Watch',
                detailedGoal: `PURPOSE
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
- OR it is tagged Still Unengaged for nurture/reporting`,
                subtitle: 'Application Taken Unengaged',
                goal: 'If unassigned, blast to LOs. Watch for engagement to move to Engaged stage.',
                trigger: 'Started by "Route to Application Taken Stages" OR Stage change to "Application Taken - Unengaged"',
                steps: [
                    'Assignment check: If unassigned → Add to "Application Blast"',
                    'Engagement watch: Wait up to 7 days for Reply/Call',
                    'On engagement: Move to "Application Taken - Engaged", Add to "Engaged -> Wait for Docs"',
                    'Timeout: Add tag "POSTAPP | Still Unengaged"'
                ],
                exitCriteria: [
                    'Claim blast sent if needed',
                    'Moves to Engaged on reply'
                ],
                testCases: [
                    'Unassigned triggers blast',
                    'Reply triggers move to Engaged'
                ]
            },
            {
                id: 'postapp-autoassign',
                name: 'Not-from-a-lead Auto-assign',
                detailedGoal: `PURPOSE
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
- Fallback blast triggered with internal tracking`,
                subtitle: 'Application Taken Not from a Lead',
                goal: 'Assign to the correct LO based on Blend data and skip AI if requested.',
                trigger: 'Stage change to "Application Taken - Not from a Lead"',
                steps: [
                    'Identify LO from Blend data',
                    'Assign Contact Owner',
                    'Skip AI (optional)',
                    'Move to "Application Taken - Engaged", Add to "Engaged -> Wait for Docs"'
                ],
                exitCriteria: [
                    'LO assigned',
                    'Moved to Engaged path'
                ],
                testCases: [
                    'LO assignment works'
                ]
            }
        ]
    },
    'Post-App (Docs Tracking)': {
        title: 'Post-App (Docs Tracking)',
        items: [
            {
                id: 'postapp-engaged-docs',
                name: 'Engaged -> Wait for Docs',
                detailedGoal: `PURPOSE
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
- Docs requested is detected and docs timer started OR LO tasked to verify if signal missing`,
                subtitle: 'Application Taken Engaged',
                goal: 'Wait for Blend to request docs. If already requested, move forward immediately.',
                trigger: 'Stage change to "Application Taken - Engaged"',
                steps: [
                    'Check if docs already requested: If yes → Move to "Borrower Docs Requested - Auto", Add to "Docs Requested Timer"',
                    'Wait for doc request event: Wait for tag "DOCS | Requested" (Timeout: 48h)',
                    'Timeout: Create LO task "Check Blend: docs request not detected"'
                ],
                exitCriteria: [
                    'Moves to Docs Requested stage when event occurs'
                ],
                testCases: [
                    'Immediate move if docs already requested',
                    'Wait works'
                ]
            },
            {
                id: 'postapp-docs-ingest',
                name: 'Blend Docs Requested Ingest',
                detailedGoal: `PURPOSE
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
- Docs Requested is recorded + stage updated + timer running`,
                subtitle: 'Docs Requested Auto',
                goal: 'Ingest Blend documentation request event and start the timer.',
                trigger: 'Incoming Webhook (Blend documentation event created)',
                steps: [
                    'Set CF – Docs Requested Timestamp = now',
                    'Add tag "DOCS | Requested"',
                    'Move stage → "Borrower Docs Requested - Auto"',
                    'Add to "Docs Requested Timer"'
                ],
                exitCriteria: [
                    'Stage updated',
                    'Timer started'
                ],
                testCases: [
                    'Webhook triggers workflow'
                ]
            },
            {
                id: 'postapp-curated',
                name: 'Docs Curated Detection',
                subtitle: 'If available',
                goal: 'If Blend indicates a LO curated/added custom documentation requests, mark that as LO engagement.',
                trigger: 'Inbound Webhook OR Tag Added',
                steps: [
                    'Add tag "DOCS | Curated"',
                    'Update Opportunity Stage to "Borrower Docs Requested – Curated"',
                    'Add internal note'
                ],
                exitCriteria: [
                    'File labeled as curated'
                ],
                testCases: [
                    'Curated event triggers workflow'
                ]
            },
            {
                id: 'postapp-docs-timer',
                name: 'Docs Requested Timer',
                detailedGoal: `PURPOSE
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
- Either docs received stops the timer OR it routes to nurture after max duration`,
                subtitle: '24h + 36h + 2-day cadence',
                goal: 'Nudge borrower to upload docs. Stop if docs received.',
                trigger: 'Started by "Blend Docs Requested Ingest" OR Stage change to Docs Requested',
                steps: [
                    'Wait 24 hours (Stop if DOCS | Received)',
                    '24h nudge: SMS borrower, Set CF – Docs Followup Stage = 24h_sent',
                    'Wait 12 more hours (Total 36h)',
                    '36h escalation: Move stage "Not received after 36 hours", SMS borrower, Email LO',
                    '2-day cadence loop: Wait 48h, Remind, Repeat (up to 14 days)'
                ],
                exitCriteria: [
                    'Stops when docs received',
                    'Nudges sent on schedule'
                ],
                testCases: [
                    '24h nudge sent',
                    '36h escalation happens',
                    'Stops on docs received'
                ]
            },
            {
                id: 'postapp-docs-uploaded',
                name: 'Blend Docs Uploaded Ingest',
                detailedGoal: `PURPOSE
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
- Docs received recorded, reminders stopped, and file is queued for LO pre-approval request`,
                subtitle: 'Docs Received',
                goal: 'Handle docs uploaded event, stop timer, and notify LO.',
                trigger: 'Incoming Webhook (Documents uploaded by Prospect)',
                steps: [
                    'Set CF – Docs Received Timestamp = now, CF – Docs Followup Stage = closed_out',
                    'Add tag "DOCS | Received"',
                    'Move stage → "Borrower Docs Received"',
                    'Stop "Docs Requested Timer"',
                    'Notify LO (Internal Email)',
                    'Move stage → "Pending LO Pre-Approval Request"',
                    'Create Task for LO: "Complete LO Pre-Approval Request checklist"'
                ],
                exitCriteria: [
                    'Timer stopped',
                    'LO notified',
                    'Task created'
                ],
                testCases: [
                    'Docs upload stops timer',
                    'Moves to Pre-Approval Request stage'
                ]
            }
        ]
    },
    'Post-App (Pre-Approval)': {
        title: 'Post-App (Pre-Approval)',
        items: [
            {
                id: 'postapp-lo-req',
                name: 'LO Pre-Approval Request Form -> Jason Queue',
                detailedGoal: `PURPOSE
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
- Opportunity is in Jason’s stage + Jason has task + email with checklist details`,
                subtitle: 'Operational Handoff',
                goal: 'Route LO request to Jason for review.',
                trigger: 'Form Submitted: FORM-LO-PREAPPROVAL-REQUEST',
                steps: [
                    'Tag/Field updates: Submitted status',
                    'Move stage → "Pre-Approval Review - Jason Work Assignment"',
                    'Create Task for Jason: "Pre-Approval Review"',
                    'Email Jason with details'
                ],
                exitCriteria: [
                    'Jason notified',
                    'Task created'
                ],
                testCases: [
                    'Form submit routes to Jason'
                ]
            },
            {
                id: 'postapp-jason-dec',
                name: 'Jason Write-Up Form -> Decision Routing',
                detailedGoal: `PURPOSE
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
- File is routed to the correct next stage/pipeline and the responsible party has tasks/notifications`,
                subtitle: 'Decision Execution',
                goal: 'Route based on Jason\'s decision (Approved, Needs Info, Declined).',
                trigger: 'Form Submitted: FORM-JASON-PREAPPROVAL-WRITEUP',
                steps: [
                    'Branch on Decision:',
                    '  • Approved: Move to "Pre-Approval Issued", Notify LO',
                    '  • Needs Info: Move to "Pre-Approval Wait - LO Work Assignment", Task for LO',
                    '  • Declined: Move to Nurture, Notify LO'
                ],
                exitCriteria: [
                    'Moved to correct post-decision stage'
                ],
                testCases: [
                    'Approved path',
                    'Needs Info path'
                ]
            },
            {
                id: 'postapp-refi',
                name: 'Refinance Review Request',
                detailedGoal: `PURPOSE
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
- Jason has a clear refi queue item + task + email context`,
                subtitle: 'Refi Queue',
                goal: 'Route refi requests to Jason.',
                trigger: 'Tag "REFI | Review Requested" OR Form Submitted',
                steps: [
                    'Move stage → "Refinance Review - Jason Work Assignment"',
                    'Create Task for Jason',
                    'Email Jason'
                ],
                exitCriteria: [
                    'Jason notified'
                ],
                testCases: [
                    'Refi request routes correctly'
                ]
            }
        ]
    },
    'Utility & Other': {
        title: 'Utility & Other',
        items: [
            {
                id: 'lang-routing',
                name: 'Spanish Routing',
                detailedGoal: `PURPOSE
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
- Spanish conversation workflow is running`,
                subtitle: 'Language detection and routing',
                goal: 'Detect Spanish leads (preferred language OR Spanish response) and route to Spanish AI handling + tracking stages.',
                trigger: 'Preferred Language field updated to Spanish OR Customer Replied (with AI classification) OR Transcript Generated',
                steps: [
                    'IF/ELSE: Preferred Language = Spanish',
                    '  • YES: Add tag "LANG | Spanish", Update Opportunity stage, Start Spanish AI engagement workflow',
                    'If using message-based detection: Trigger Customer Replied, AI classification, If Spanish → apply routing'
                ],
                exitCriteria: [
                    'Spanish leads are isolated in their own stages for reporting and are engaged appropriately'
                ],
                testCases: [
                    'Blend preferred language routes correctly',
                    'Spanish reply routes correctly'
                ]
            },
            {
                id: 'dnc-handler',
                name: 'DNC / STOP Handler',
                detailedGoal: `PURPOSE
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
- No future automated contact occurs unless customer re-opt-ins`,
                subtitle: 'Opt-out handling',
                goal: 'If contact opts out, stop calling/texting and send email re-engagement instructions.',
                trigger: 'Keyword trigger (STOP, DNC) in inbound SMS OR "Contact DND enabled" trigger',
                steps: [
                    'Update opportunity stage: "DNC – Specific DNC Request"',
                    'Add tag: "DNC | Requested"',
                    'Disable SMS/calls for the contact (DND actions)',
                    'Send Email re-engagement instructions',
                    'Remove from active workflows (monitoring/claim/gate)'
                ],
                exitCriteria: [
                    'Contact is suppressed and moved to DNC stage'
                ],
                testCases: [
                    'STOP triggers DNC stage and suppresses future outreach'
                ]
            },
            {
                id: 'data-sync',
                name: 'Loan Amount → Opportunity Value Sync',
                detailedGoal: `PURPOSE
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
- Missing values are clearly tagged for cleanup`,
                subtitle: 'Data synchronization',
                goal: 'Ensure Opportunity Value is set from Loan Amount for accurate reporting.',
                trigger: 'Opportunity Created OR Contact Field Updated: CF – Loan Amount',
                steps: [
                    'IF/ELSE: If CF – Loan Amount is empty → add tag "DATA | Missing Loan Amount" and end',
                    'Update Opportunity: Set Opportunity Value = CF – Loan Amount'
                ],
                exitCriteria: [
                    'Opportunity value is reliably populated'
                ],
                testCases: [
                    'Zillow/MRC leads populate value',
                    'Missing values get tagged for backfill'
                ]
            },
            {
                id: 'data-missing',
                name: 'Missing Loan Amount Tagging',
                detailedGoal: `PURPOSE
See WF-DATA-01 (Loan Amount Sync).
This workflow component specifically handles the "Missing" logic if implemented separately.

WHAT THIS WORKFLOW MUST DO
If value is missing:
- Add tag “VALUE | Missing”
- Create internal task: “Backfill loan amount mapping for this lead”`,
                subtitle: 'Optional data tracking',
                goal: 'Tag contacts/opportunities missing loan amount data for backfill.',
                trigger: 'Opportunity Created OR Contact Field Updated',
                optional: true,
                steps: [
                    'Check if CF – Loan Amount is empty',
                    'If empty: Add tag "DATA | Missing Loan Amount"'
                ],
                exitCriteria: [
                    'Missing loan amounts are tagged for manual review'
                ],
                testCases: [
                    'Contacts without loan amount get tagged'
                ]
            },
            {
                id: 'lead-not-interested',
                name: 'Not Interested Handling',
                detailedGoal: `PURPOSE
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
- Outreach stopped (unless they re-initiate)`,
                subtitle: 'Recommended lead qualification',
                goal: 'If lead explicitly says they are not interested, respond politely and route them for later re-engagement (no aggressive chasing).',
                trigger: 'Customer Replied (in lead intake / AI messages) with AI intent classification = "not interested" (or keyword rules)',
                optional: true,
                steps: [
                    'Update opportunity stage: "Not Interested"',
                    'Send SMS: "Thanks — I\'ll stop reaching out. If you ever want help, text us anytime."',
                    'Add tag: "NOT INTERESTED | CONFIRMED"',
                    'Remove from active micro-workflows'
                ],
                exitCriteria: [
                    'Lead is categorized and no longer spams pipeline logic'
                ],
                testCases: [
                    '"not ready / wrong person / stop" routes correctly'
                ]
            },
            {
                id: 'postapp-nurture',
                name: 'Nurture Routing (Placeholder)',
                detailedGoal: `PURPOSE
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
- File is categorized, moved to the correct nurture stage, and an appropriate nurture sequence is running`,
                subtitle: 'Not Credit Worthy / Docs Never Received',
                goal: 'Move rejected/stalled leads to nurture.',
                trigger: 'Various rejection points',
                steps: [
                    'Move to Nurture Pipeline/Stage',
                    'Apply tag-based status'
                ],
                exitCriteria: [
                    'Lead moved to nurture'
                ],
                testCases: [
                    'Routing works'
                ]
            }
        ]
    }
};

const implementationOrder = [
    { id: 'impl-1', title: 'Create fields/tags/teams', description: 'Complete Section 2 setup requirements' },
    { id: 'impl-2', title: 'Build claim pages + claim form', description: 'Complete Section 3 (claim page, form, success page)' },
    { id: 'impl-3', title: 'Build Claim & Assignment Workflows', description: 'Application Blast + Claim Processor' },
    { id: 'impl-4', title: 'Build SLA Gate Workflows', description: '30-minute LO First-Touch Gate + Mark First Touch' },
    { id: 'impl-5', title: 'Build Blend Ingest Workflow', description: 'Blend Event Ingest' },
    { id: 'impl-6', title: 'Build Blend Monitor Workflows', description: 'Blend Monitoring Loop + Inactivity Branch' },
    { id: 'impl-7', title: 'Build Utility Workflows', description: 'Spanish Routing, DNC Handler, Data Sync, Not Interested Handling' },
    { id: 'impl-8', title: 'Create Post-App Pipeline C + Stages', description: 'Create "Post App – Working – Not Yet Converted" pipeline and all 14 stages.' },
    { id: 'impl-9', title: 'Create Post-App Fields, Tags, Custom Values', description: 'Add new sections D, E, F, G, H to Custom Fields and create new Tags.' },
    { id: 'impl-10', title: 'Build Post-App Forms', description: 'Build "LO Pre-Approval Request", "Jason Pre-Approval Write-Up", and "Refi Review Request" forms.' },
    { id: 'impl-11', title: 'Build Post-App Ingest & Routing', description: 'Blend Credit Pull Ingest, Router, Unengaged Watch, Auto-assign' },
    { id: 'impl-12', title: 'Build Post-App Docs Tracking', description: 'Engaged -> Wait for Docs, Docs Requested Ingest, Docs Uploaded Ingest, Docs Timer' },
    { id: 'impl-13', title: 'Build Post-App Pre-Approval & Refi', description: 'LO Request -> Jason, Jason Write-Up -> Decision, Refi Review' },
    { id: 'impl-14', title: 'Run tests', description: 'Complete Section 7 test plan' }
];

const testCases = [
    {
        id: 'test-a',
        title: 'Test A — Blend start',
        description: 'Send a test Blend "user created" event',
        checks: [
            'Contact created',
            'Opportunity created in Unassigned pipeline "Actively Completing"',
            'SMS sent',
            'Monitoring started'
        ]
    },
    {
        id: 'test-b',
        title: 'Test B — SSN entered triggers assignment blast',
        description: 'Simulate middleware update setting CF – Blend SSN Entered = Yes',
        checks: [
            'Monitoring stops',
            'Stage moves to Awaiting Assignment',
            'LO team receives blast with claim link'
        ]
    },
    {
        id: 'test-c',
        title: 'Test C — Claim concurrency',
        description: 'Two LOs submit the claim form within seconds',
        checks: [
            'First gets assigned',
            'Second receives denial'
        ]
    },
    {
        id: 'test-d',
        title: 'Test D — SLA gate',
        description: 'Claim and do nothing',
        checks: [
            'At 30 minutes: reblast occurs',
            'Excluded LO recorded',
            'Previous LO receives email'
        ]
    },
    {
        id: 'test-e',
        title: 'Test E — Inactivity 45m',
        description: 'Simulate inactivity by setting tag/field used by inactivity check',
        checks: [
            'Moved to Not Finished stage',
            'Call blast fires',
            'Follow-up SMS sent after failure'
        ]
    },
    {
        id: 'test-f',
        title: 'Test F — Spanish',
        description: 'Set Preferred Language = Spanish',
        checks: [
            'Spanish stage set',
            'Spanish AI flow triggered'
        ]
    },
    {
        id: 'test-g',
        title: 'Test G — STOP/DNC',
        description: 'Send STOP',
        checks: [
            'DNC stage set',
            'Outreach suppressed',
            'Email sent'
        ]
    }
];

const gotchas = [
    'Ensure contact owner + opportunity owner both change on claim',
    'Ensure blast uses correct domain and the claim URL is reachable by LOs on mobile',
    'Ensure excluded LO logic blocks immediate reclaim after timeout',
    'Ensure monitoring loop is stopped when assignment/inactivity happens',
    'Ensure no duplicate opportunities are created for the same contact',
    'Ensure loan amount mapping is reliable before you scale lead volume',
    'Ensure "Phone Engaged" uses Transcript Generated rather than call attempt'
];

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    initializeChecklists();
    initializeWorkflows();
    initializeTests();
    initializeGotchas();
    initializeImplementationOrder();
    loadSavedCheckboxStates();
    updateProgress();

    // Initialize Mermaid diagrams after page load
    // Mermaid will auto-render with startOnLoad: true, but we'll also manually render visible ones
    setTimeout(() => {
        renderVisibleMermaidDiagrams();
    }, 1000);
});

function renderVisibleMermaidDiagrams() {
    // Simply call mermaid.run() - it will handle rendering
    try {
        mermaid.run();
    } catch (e) {
        console.error('Mermaid rendering error:', e);
    }
}

function switchTab(tabName, element) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked button
    if (element) {
        element.classList.add('active');
    }

    // Reinitialize Mermaid diagrams for the new tab
    setTimeout(() => {
        renderVisibleMermaidDiagrams();
    }, 100);
}

function toggleSubSection(titleElement) {
    const section = titleElement.closest('.workflow-section');
    if (section) {
        const wasCollapsed = section.classList.contains('collapsed');
        section.classList.toggle('collapsed');

        // If section was expanded, re-render Mermaid diagrams after a short delay
        if (wasCollapsed) {
            setTimeout(() => {
                renderVisibleMermaidDiagrams();
            }, 300);
        }
    }
}

function loadSavedCheckboxStates() {
    // Load saved states for team setup and opp ownership
    ['team-setup', 'opp-ownership'].forEach(id => {
        const saved = localStorage.getItem(id);
        const checkbox = document.getElementById(`${id}-cb`);
        const item = document.querySelector(`[data-id="${id}"]`);
        if (checkbox && saved === 'true') {
            checkbox.checked = true;
            if (item) item.classList.add('completed');
        }
    });
}

function initializeChecklists() {
    // Custom Fields
    const fieldsChecklist = document.getElementById('fields-checklist');
    if (fieldsChecklist) fieldsChecklist.innerHTML = '';
    let fieldIndex = 0;

    Object.keys(customFields).forEach(key => {
        const category = customFields[key];
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'workflow-section collapsed';
        if (fieldIndex > 0) categoryDiv.classList.add('mt-2');

        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'workflow-section-title';
        categoryTitle.textContent = `(${key}) ${category.title}`;
        categoryTitle.onclick = function () { toggleSubSection(this); };
        categoryDiv.appendChild(categoryTitle);

        const fieldsWrapper = document.createElement('div');
        fieldsWrapper.className = 'workflow-section-content-wrapper';

        category.fields.forEach(field => {
            const item = document.createElement('div');
            item.className = 'checklist-item';
            item.setAttribute('data-id', `field-${field.name.replace(/\s/g, '-').toLowerCase()}`);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.onchange = updateProgress;

            const content = document.createElement('div');
            content.className = 'checklist-item-content';

            const title = document.createElement('div');
            title.className = 'checklist-item-title';
            title.innerHTML = `<strong>${field.name}</strong> ${field.optional ? '<span class="badge badge-optional">Optional</span>' : ''}`;

            const desc = document.createElement('div');
            desc.className = 'checklist-item-description';
            desc.innerHTML = `<strong>Type:</strong> ${field.type}${field.values ? `<br><strong>Values:</strong> ${field.values}` : ''}${field.note ? `<br><em>${field.note}</em>` : ''}`;

            content.appendChild(title);
            content.appendChild(desc);
            item.appendChild(checkbox);
            item.appendChild(content);
            fieldsWrapper.appendChild(item);

            // Load saved state (Default to checked)
            const saved = localStorage.getItem(item.getAttribute('data-id'));
            if (saved === 'true' || saved === null) {
                checkbox.checked = true;
                item.classList.add('completed');
            }
        });

        categoryDiv.appendChild(fieldsWrapper);
        fieldsChecklist.appendChild(categoryDiv);
        fieldIndex++;
    });

    // Tags
    const tagsChecklist = document.getElementById('tags-checklist');
    if (tagsChecklist) tagsChecklist.innerHTML = '';
    tags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.setAttribute('data-id', `tag-${tag.replace(/\s/g, '-').toLowerCase()}`);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.onchange = updateProgress;

        const content = document.createElement('div');
        content.className = 'checklist-item-content';

        const title = document.createElement('div');
        title.className = 'checklist-item-title';
        title.textContent = tag;

        content.appendChild(title);
        item.appendChild(checkbox);
        item.appendChild(content);
        tagsChecklist.appendChild(item);

        // Load saved state (Default to checked)
        const saved = localStorage.getItem(item.getAttribute('data-id'));
        if (saved === 'true' || saved === null) {
            checkbox.checked = true;
            item.classList.add('completed');
        }
    });

    // Claim Page Steps
    const claimChecklist = document.getElementById('claim-checklist');
    if (claimChecklist) claimChecklist.innerHTML = '';
    claimPageSteps.forEach(step => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.setAttribute('data-id', step.id);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.onchange = updateProgress;

        const content = document.createElement('div');
        content.className = 'checklist-item-content';

        const title = document.createElement('div');
        title.className = 'checklist-item-title';
        title.textContent = step.title;

        const desc = document.createElement('div');
        desc.className = 'checklist-item-description';
        desc.innerHTML = step.description;

        content.appendChild(title);
        content.appendChild(desc);
        item.appendChild(checkbox);
        item.appendChild(content);
        claimChecklist.appendChild(item);

        // Load saved state (Default to checked)
        const saved = localStorage.getItem(item.getAttribute('data-id'));
        if (saved === 'true' || saved === null) {
            checkbox.checked = true;
            item.classList.add('completed');
        }
    });
}

function initializeWorkflows() {
    const container = document.getElementById('workflows-container');
    if (container) container.innerHTML = '';

    Object.keys(workflows).forEach((key, index) => {
        const category = workflows[key];

        // Create category section
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'workflow-section collapsed';
        if (index > 0) categoryDiv.classList.add('mt-2');

        // Category Title
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'workflow-section-title';
        categoryTitle.textContent = category.title;
        categoryTitle.onclick = function () { toggleSubSection(this); };
        categoryDiv.appendChild(categoryTitle);

        // Category Content Wrapper
        const categoryContent = document.createElement('div');
        categoryContent.className = 'workflow-section-content-wrapper';

        // Iterate workflows in this category
        category.items.forEach(workflow => {
            const card = document.createElement('div');
            card.className = 'workflow-card collapsed';
            card.setAttribute('data-id', workflow.id);

            const header = document.createElement('div');
            header.className = 'workflow-header';
            header.onclick = function () {
                card.classList.toggle('collapsed');
            };

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'workflow-header-checkbox';
            checkbox.onchange = function (e) {
                e.stopPropagation();
                if (this.checked) {
                    card.classList.add('completed');
                } else {
                    card.classList.remove('completed');
                }
                updateProgress();
            };
            checkbox.onclick = function (e) {
                e.stopPropagation();
            };

            const headerLeft = document.createElement('div');
            headerLeft.className = 'workflow-header-left';

            const headerContent = document.createElement('div');
            headerContent.className = 'workflow-header-content';

            const id = document.createElement('div');
            id.className = 'workflow-id';
            id.textContent = workflow.id; // Keep ID for reference but it's small

            const title = document.createElement('div');
            title.className = 'workflow-title';
            title.textContent = `${workflow.name} — ${workflow.subtitle}`;

            if (workflow.optional) {
                const badge = document.createElement('span');
                badge.className = 'badge badge-optional';
                badge.textContent = 'Optional';
                title.appendChild(badge);
            }
            headerContent.appendChild(id);
            headerContent.appendChild(title);

            headerLeft.appendChild(checkbox);
            headerLeft.appendChild(headerContent);

            header.appendChild(headerLeft);

            const goal = document.createElement('div');
            goal.className = 'workflow-section';
            const goalTitle = document.createElement('div');
            goalTitle.className = 'workflow-section-title no-collapse';
            goalTitle.textContent = 'Goal';
            const goalContent = document.createElement('div');
            goalContent.className = 'workflow-section-content';
            goalContent.textContent = workflow.goal;
            goal.appendChild(goalTitle);
            goal.appendChild(goalContent);

            const trigger = document.createElement('div');
            trigger.className = 'workflow-section';
            const triggerTitle = document.createElement('div');
            triggerTitle.className = 'workflow-section-title no-collapse';
            triggerTitle.textContent = 'Trigger';
            const triggerContent = document.createElement('div');
            triggerContent.className = 'workflow-section-content';
            triggerContent.textContent = workflow.trigger;
            trigger.appendChild(triggerTitle);
            trigger.appendChild(triggerContent);

            const steps = document.createElement('div');
            steps.className = 'workflow-section';
            const stepsTitle = document.createElement('div');
            stepsTitle.className = 'workflow-section-title no-collapse';
            stepsTitle.textContent = 'Steps (Build Order)';
            const stepsContent = document.createElement('div');
            stepsContent.className = 'workflow-section-content';
            const stepsList = document.createElement('ol');
            stepsList.className = 'workflow-steps';
            workflow.steps.forEach(step => {
                const li = document.createElement('li');
                li.innerHTML = step.replace(/\n/g, '<br>');
                stepsList.appendChild(li);
            });
            stepsContent.appendChild(stepsList);
            steps.appendChild(stepsTitle);
            steps.appendChild(stepsContent);

            const exit = document.createElement('div');
            exit.className = 'workflow-section';
            const exitTitle = document.createElement('div');
            exitTitle.className = 'workflow-section-title no-collapse';
            exitTitle.textContent = 'Exit Criteria';
            const exitContent = document.createElement('div');
            exitContent.className = 'workflow-section-content';
            const exitList = document.createElement('ul');
            exitList.style.listStyle = 'none';
            exitList.style.paddingLeft = '0';
            workflow.exitCriteria.forEach(criteria => {
                const li = document.createElement('li');
                li.textContent = `✓ ${criteria}`;
                li.style.marginBottom = '0.5rem';
                exitList.appendChild(li);
            });
            exitContent.appendChild(exitList);
            exit.appendChild(exitTitle);
            exit.appendChild(exitContent);

            const tests = document.createElement('div');
            tests.className = 'workflow-section';
            const testsTitle = document.createElement('div');
            testsTitle.className = 'workflow-section-title no-collapse';
            testsTitle.textContent = 'Test Cases';
            const testsContent = document.createElement('div');
            testsContent.className = 'workflow-section-content';
            const testsList = document.createElement('ul');
            testsList.style.listStyle = 'none';
            testsList.style.paddingLeft = '0';
            workflow.testCases.forEach(test => {
                const li = document.createElement('li');
                li.textContent = `✓ ${test}`;
                li.style.marginBottom = '0.5rem';
                testsList.appendChild(li);
            });
            testsContent.appendChild(testsList);
            tests.appendChild(testsTitle);
            tests.appendChild(testsContent);

            const cardContent = document.createElement('div');
            cardContent.className = 'workflow-card-content';

            if (workflow.detailedGoal) {
                const detailed = document.createElement('div');
                detailed.className = 'workflow-section';
                const detailedTitle = document.createElement('div');
                detailedTitle.className = 'workflow-section-title';
                detailedTitle.textContent = '🤖 AI Prompt / Detailed Spec';
                detailedTitle.onclick = function () { toggleSubSection(this); };

                const detailedWrapper = document.createElement('div');
                detailedWrapper.className = 'workflow-section-content-wrapper';

                const detailedContent = document.createElement('div');
                detailedContent.className = 'workflow-section-content';

                // Copy button
                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copy Prompt';
                copyBtn.style.marginBottom = '0.5rem';
                copyBtn.style.fontSize = '0.8rem';
                copyBtn.style.padding = '0.3rem 0.6rem';
                copyBtn.onclick = function (e) {
                    e.stopPropagation();
                    navigator.clipboard.writeText(workflow.detailedGoal.trim()).then(() => {
                        const original = copyBtn.textContent;
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => copyBtn.textContent = original, 2000);
                    });
                };

                const pre = document.createElement('pre');
                pre.style.whiteSpace = 'pre-wrap';
                pre.style.background = '#f1f5f9';
                pre.style.color = '#334155';
                pre.style.padding = '1rem';
                pre.style.borderRadius = '4px';
                pre.style.fontSize = '0.85rem';
                pre.style.border = '1px solid var(--border-light)';
                pre.style.fontFamily = 'monospace';
                pre.style.maxHeight = '400px';
                pre.style.overflowY = 'auto';
                pre.textContent = workflow.detailedGoal.trim();

                detailedContent.appendChild(copyBtn);
                detailedContent.appendChild(pre);
                detailedWrapper.appendChild(detailedContent);
                detailed.appendChild(detailedTitle);
                detailed.appendChild(detailedWrapper);
                cardContent.appendChild(detailed);
            }

            card.appendChild(header);
            cardContent.appendChild(goal);
            cardContent.appendChild(trigger);
            if (workflow.inputs) {
                const inputs = document.createElement('div');
                inputs.className = 'workflow-section';
                const inputsTitle = document.createElement('div');
                inputsTitle.className = 'workflow-section-title no-collapse';
                inputsTitle.textContent = 'Required Inputs';
                const inputsContent = document.createElement('div');
                inputsContent.className = 'workflow-section-content';
                const inputsList = document.createElement('ul');
                inputsList.style.listStyle = 'none';
                inputsList.style.paddingLeft = '0';
                workflow.inputs.forEach(input => {
                    const li = document.createElement('li');
                    li.textContent = `• ${input}`;
                    li.style.marginBottom = '0.5rem';
                    inputsList.appendChild(li);
                });
                inputsContent.appendChild(inputsList);
                inputs.appendChild(inputsTitle);
                inputs.appendChild(inputsContent);
                cardContent.appendChild(inputs);
            }
            cardContent.appendChild(steps);
            cardContent.appendChild(exit);
            cardContent.appendChild(tests);

            card.appendChild(cardContent);

            // Load saved state - Default specific completed workflows
            const uncompletedIds = ['postapp-refi', 'lang-routing', 'dnc-handler', 'data-sync', 'data-missing', 'lead-not-interested', 'postapp-nurture'];
            const saved = localStorage.getItem(`workflow-${workflow.id}`);

            if (saved === 'true' || (saved === null && !uncompletedIds.includes(workflow.id))) {
                checkbox.checked = true;
                card.classList.add('completed');
            }

            categoryContent.appendChild(card);
        });

        categoryDiv.appendChild(categoryContent);
        container.appendChild(categoryDiv);
    });
}

function initializeImplementationOrder() {
    const container = document.getElementById('implementation-checklist');
    if (container) container.innerHTML = '';

    implementationOrder.forEach(item => {
        const div = document.createElement('div');
        div.className = 'checklist-item';
        div.setAttribute('data-id', item.id);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.onchange = updateProgress;

        const content = document.createElement('div');
        content.className = 'checklist-item-content';

        const title = document.createElement('div');
        title.className = 'checklist-item-title';
        title.textContent = item.title;

        const desc = document.createElement('div');
        desc.className = 'checklist-item-description';
        desc.textContent = item.description;

        content.appendChild(title);
        content.appendChild(desc);
        div.appendChild(checkbox);
        div.appendChild(content);
        container.appendChild(div);

        // Load saved state
        const saved = localStorage.getItem(item.id);
        if (saved === 'true') {
            checkbox.checked = true;
            div.classList.add('completed');
        }
    });
}

function initializeTests() {
    const container = document.getElementById('tests-container');
    if (container) container.innerHTML = '';

    testCases.forEach(test => {
        const div = document.createElement('div');
        div.className = 'test-case';
        div.setAttribute('data-id', test.id);

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'start';
        header.style.marginBottom = '0.75rem';

        const title = document.createElement('div');
        title.className = 'test-case-title';
        title.textContent = test.title;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.width = '20px';
        checkbox.style.height = '20px';
        checkbox.onchange = function () {
            updateProgress();
        };

        header.appendChild(title);
        header.appendChild(checkbox);

        const desc = document.createElement('div');
        desc.style.marginBottom = '1rem';
        desc.style.color = 'var(--text-light)';
        desc.textContent = test.description;

        const steps = document.createElement('ul');
        steps.className = 'test-case-steps';
        test.checks.forEach(check => {
            const li = document.createElement('li');
            li.textContent = check;
            steps.appendChild(li);
        });

        div.appendChild(header);
        div.appendChild(desc);
        div.appendChild(steps);
        container.appendChild(div);

        // Load saved state
        const saved = localStorage.getItem(`test-${test.id}`);
        if (saved === 'true') {
            checkbox.checked = true;
        }
    });
}

function initializeGotchas() {
    const container = document.getElementById('gotchas-container');
    if (container) container.innerHTML = '';

    gotchas.forEach((gotcha, index) => {
        const div = document.createElement('div');
        div.className = 'gotcha-item';
        div.setAttribute('data-id', `gotcha-${index}`);

        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.alignItems = 'start';
        content.style.gap = '1rem';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.width = '20px';
        checkbox.style.height = '20px';
        checkbox.style.marginTop = '2px';
        checkbox.style.flexShrink = '0';
        checkbox.onchange = function () {
            if (this.checked) {
                div.style.background = '#f0fdf4';
                div.style.borderLeftColor = 'var(--success)';
            } else {
                div.style.background = '#fef3c7';
                div.style.borderLeftColor = 'var(--warning)';
            }
            updateProgress();
        };

        const text = document.createElement('div');
        text.textContent = gotcha;

        content.appendChild(checkbox);
        content.appendChild(text);
        div.appendChild(content);
        container.appendChild(div);

        // Load saved state
        const saved = localStorage.getItem(`gotcha-${index}`);
        if (saved === 'true') {
            checkbox.checked = true;
            div.style.background = '#f0fdf4';
            div.style.borderLeftColor = 'var(--success)';
        }
    });
}

function updateProgress() {
    console.log('Saving progress...');
    // Save checkbox states
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        const item = checkbox.closest('[data-id]');
        if (item) {
            const id = item.getAttribute('data-id');
            localStorage.setItem(id, checkbox.checked);
        }
        const workflow = checkbox.closest('.workflow-card');
        if (workflow) {
            const id = workflow.getAttribute('data-id');
            localStorage.setItem(`workflow-${id}`, checkbox.checked);
        }
        const test = checkbox.closest('.test-case');
        if (test) {
            const id = test.getAttribute('data-id');
            localStorage.setItem(`test-${id}`, checkbox.checked);
        }
        const gotcha = checkbox.closest('.gotcha-item');
        if (gotcha) {
            const index = gotcha.getAttribute('data-id').replace('gotcha-', '');
            localStorage.setItem(`gotcha-${index}`, checkbox.checked);
        }
    });

    // Update checklist item styles
    document.querySelectorAll('.checklist-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });

    // Count completions by section
    const setupCount = countSection('setup');
    const claimCount = countSection('claim-page');
    const workflowCount = countWorkflows();
    const implCount = countImplementation();
    const testCount = countTests();
    const gotchaCount = countGotchas();

    // Update badges
    document.getElementById('setup-badge').textContent = `${setupCount.completed}/${setupCount.total}`;
    document.getElementById('claim-badge').textContent = `${claimCount.completed}/${claimCount.total}`;
    document.getElementById('workflow-badge').textContent = `${workflowCount.completed}/${workflowCount.total}`;
    document.getElementById('test-badge').textContent = `${testCount.completed}/${testCount.total}`;
    document.getElementById('gotcha-badge').textContent = `${gotchaCount.completed}/${gotchaCount.total}`;

    // Calculate overall progress
    const totalItems = setupCount.total + claimCount.total + workflowCount.total + implCount.total + testCount.total + gotchaCount.total;
    const completedItems = setupCount.completed + claimCount.completed + workflowCount.completed + implCount.completed + testCount.completed + gotchaCount.completed;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Update progress bar
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${Math.round(progress)}% Complete (${completedItems}/${totalItems} items)`;
}

function countSection(sectionName) {
    // Map old section names to new tab IDs
    const tabMap = {
        'setup': 'tab-setup',
        'claim-page': 'tab-claim'
    };

    const tabId = tabMap[sectionName] || `tab-${sectionName}`;
    const tab = document.getElementById(tabId);
    if (!tab) return { completed: 0, total: 0 };

    const checkboxes = tab.querySelectorAll('input[type="checkbox"]');
    let completed = 0;
    checkboxes.forEach(cb => {
        if (cb.checked) completed++;
    });
    return { completed, total: checkboxes.length };
}

function countWorkflows() {
    const workflows = document.querySelectorAll('.workflow-card');
    let completed = 0;
    workflows.forEach(wf => {
        const checkbox = wf.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) completed++;
    });
    return { completed, total: workflows.length };
}

function countImplementation() {
    const items = document.querySelectorAll('#implementation-checklist .checklist-item');
    let completed = 0;
    items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) completed++;
    });
    return { completed, total: items.length };
}

function countTests() {
    const tests = document.querySelectorAll('.test-case');
    let completed = 0;
    tests.forEach(test => {
        const checkbox = test.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) completed++;
    });
    return { completed, total: tests.length };
}

function countGotchas() {
    const gotchas = document.querySelectorAll('.gotcha-item');
    let completed = 0;
    gotchas.forEach(gotcha => {
        const checkbox = gotcha.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) completed++;
    });
    return { completed, total: gotchas.length };
}

function resetProgress() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        localStorage.clear();
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        document.querySelectorAll('.checklist-item').forEach(item => {
            item.classList.remove('completed');
        });
        document.querySelectorAll('.workflow-card').forEach(card => {
            card.classList.remove('completed');
        });
        document.querySelectorAll('.gotcha-item').forEach(item => {
            item.style.background = '#fef3c7';
            item.style.borderLeftColor = 'var(--warning)';
        });
        updateProgress();
    }
}


// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing GHL Workflow Guide...');
    initializeChecklists();
    initializeWorkflows();
    initializeImplementationOrder();
    initializeTests();
    initializeGotchas();
    loadSavedCheckboxStates();
    updateProgress();
    console.log('Initialization complete.');
});
