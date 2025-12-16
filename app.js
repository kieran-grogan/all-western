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
    'DATA | Missing Loan Amount'
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

const workflows = [
    {
        id: 'WF-BLEND-01',
        name: 'Blend Event Ingest',
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
            'Action: Add to Workflow WF-BLEND-02'
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
        id: 'WF-BLEND-02',
        name: 'Blend Monitoring Loop',
        subtitle: 'Every 5 minutes',
        goal: 'Poll for progress and route: SSN/DOB entered → assignment blast immediately; inactivity ≥45m → call blast',
        trigger: 'Added to Workflow from WF-BLEND-01',
        steps: [
            'Action: Update Opportunity Stage to "Unassigned – Working on Application (Blend Monitoring)"',
            'Action: Add Tag "BLEND | Monitoring Active"',
            'Loop block (repeat):',
            '  • Wait 5 minutes',
            '  • Action: Webhook (Outbound) → "Check Blend Status" (updates Last Activity, SSN Entered, DOB Entered, Progress %, Status)',
            '  • IF/ELSE: SSN/DOB entered → Remove tag, stop loop, Add to WF-CLAIM-01',
            '  • IF/ELSE: Inactive ≥45 minutes → Remove tag, stop loop, Add to WF-BLEND-03'
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
        id: 'WF-BLEND-03',
        name: 'Blend Inactivity Branch',
        subtitle: '45 minutes',
        goal: 'Revive stalled app: call blast, if unsuccessful → SMS follow-up, then return to general revival pool',
        trigger: 'Added to workflow from WF-BLEND-02 inactivity branch',
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
    },
    {
        id: 'WF-CLAIM-01',
        name: 'Application Blast',
        subtitle: 'Send claim link to all LOs',
        goal: 'Send a single message to all LOs with one claim link so everyone has equal response time and can see lead context before claiming.',
        trigger: 'Added to workflow from WF-BLEND-02 (SSN/DOB entered) OR from other flows',
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
        id: 'WF-CLAIM-02',
        name: 'Claim Processor',
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
            '  • Action: Add to Workflow WF-GATE-01',
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
        id: 'WF-GATE-01',
        name: '30-minute LO First-Touch Gate',
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
            '    - Action: Add to Workflow WF-CLAIM-01 (reblast)'
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
        id: 'WF-GATE-02',
        name: 'Mark First Touch',
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
    },
    {
        id: 'WF-LANG-01',
        name: 'Spanish Routing',
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
        id: 'WF-DNC-01',
        name: 'DNC / STOP Handler',
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
        id: 'WF-DATA-01',
        name: 'Loan Amount → Opportunity Value Sync',
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
        id: 'WF-DATA-02',
        name: 'Missing Loan Amount Tagging',
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
        id: 'WF-LEAD-01',
        name: 'Not Interested Handling',
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
    }
];

const implementationOrder = [
    { id: 'impl-1', title: 'Create fields/tags/teams', description: 'Complete Section 2 setup requirements' },
    { id: 'impl-2', title: 'Build claim pages + claim form', description: 'Complete Section 3 (claim page, form, success page)' },
    { id: 'impl-3', title: 'Build WF-CLAIM-01 and WF-CLAIM-02', description: 'Application Blast + Claim Processor workflows' },
    { id: 'impl-4', title: 'Build WF-GATE-01 and WF-GATE-02', description: 'SLA gate + First touch marker workflows' },
    { id: 'impl-5', title: 'Build WF-BLEND-01', description: 'Blend ingest workflow' },
    { id: 'impl-6', title: 'Build WF-BLEND-02 and WF-BLEND-03', description: 'Monitor + Inactivity workflows' },
    { id: 'impl-7', title: 'Build Spanish routing + DNC + data sync workflows', description: 'WF-LANG-01, WF-DNC-01, WF-DATA-01, WF-DATA-02, WF-LEAD-01' },
    { id: 'impl-8', title: 'Run tests', description: 'Complete Section 7 test plan' }
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
document.addEventListener('DOMContentLoaded', function() {
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
    let fieldIndex = 0;
    
    Object.keys(customFields).forEach(key => {
        const category = customFields[key];
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'workflow-section collapsed';
        if (fieldIndex > 0) categoryDiv.classList.add('mt-2');
        
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'workflow-section-title';
        categoryTitle.textContent = `(${key}) ${category.title}`;
        categoryTitle.onclick = function() { toggleSubSection(this); };
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
            
            // Load saved state
            const saved = localStorage.getItem(item.getAttribute('data-id'));
            if (saved === 'true') {
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
        
        // Load saved state
        const saved = localStorage.getItem(item.getAttribute('data-id'));
        if (saved === 'true') {
            checkbox.checked = true;
            item.classList.add('completed');
        }
    });
    
    // Claim Page Steps
    const claimChecklist = document.getElementById('claim-checklist');
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
        
        // Load saved state
        const saved = localStorage.getItem(item.getAttribute('data-id'));
        if (saved === 'true') {
            checkbox.checked = true;
            item.classList.add('completed');
        }
    });
}

function initializeWorkflows() {
    const container = document.getElementById('workflows-container');
    
    workflows.forEach(workflow => {
        const card = document.createElement('div');
        card.className = 'workflow-card collapsed';
        card.setAttribute('data-id', workflow.id);
        
        const header = document.createElement('div');
        header.className = 'workflow-header';
        header.onclick = function() {
            card.classList.toggle('collapsed');
        };
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'workflow-header-checkbox';
        checkbox.onchange = function(e) {
            e.stopPropagation();
            if (this.checked) {
                card.classList.add('completed');
            } else {
                card.classList.remove('completed');
            }
            updateProgress();
        };
        checkbox.onclick = function(e) {
            e.stopPropagation();
        };
        
        const headerLeft = document.createElement('div');
        headerLeft.className = 'workflow-header-left';
        
        const headerContent = document.createElement('div');
        headerContent.className = 'workflow-header-content';
        
        const id = document.createElement('div');
        id.className = 'workflow-id';
        id.textContent = workflow.id;
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
        
        container.appendChild(card);
        
        // Load saved state
        const saved = localStorage.getItem(`workflow-${workflow.id}`);
        if (saved === 'true') {
            checkbox.checked = true;
            card.classList.add('completed');
        }
    });
}

function initializeImplementationOrder() {
    const container = document.getElementById('implementation-checklist');
    
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
        checkbox.onchange = function() {
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
        checkbox.onchange = function() {
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

