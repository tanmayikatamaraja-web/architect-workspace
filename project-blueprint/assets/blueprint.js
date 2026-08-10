/* ============================================================================
   blueprint.js — THE single source of truth for this knowledge base.
   Every page renders from this object. If a number appears twice in this
   file, that is a bug: derive it instead (see the count() functions below).

   Loaded with a classic <script src>. `const` at top level is a global
   lexical binding, NOT a property of window — other scripts reference the
   bare identifier BLUEPRINT, never window.BLUEPRINT.
   ========================================================================== */

const BLUEPRINT = {

  meta: {
    project: 'Pre-Med Study Desk',
    tagline: 'A study and opportunity organiser for high school and college students heading toward medicine.',
    dayOne: 'It should be organized well first.',
    dayOneOwner: 'spine',
    architecturePath: 'project-blueprint/architecture.md',
    generated: '2026-08-06'
  },

  /* ---- The idea, verbatim and restated ---------------------------------- */
  idea: {
    paragraph: 'The project should be an organizational and educational tool for high school students and college students interested in pursuing medicine. It should be able to display different topics (anatomy, virus’, etc.) and it should list some opportunities for students (research, volunteering, shadowing). It should also have an area where you can take your own notes and place pdf’s and other materials. One thing that it must do well on day one is that it should be organized well first.',
    restated: 'Three kinds of content — topics you read, opportunities you apply to, and materials you bring — that most tools would keep in three separate silos. The last sentence is the whole design brief: organisation is not a feature added later, it is the thing being built.',
    audiences: [
      { name: 'High school student', note: 'Exploring medicine, needs the entry-level slice of every topic and the opportunities open to under-18s.' },
      { name: 'College student', note: 'Committed to the path, needs depth, research listings and a place to keep coursework.' },
      { name: 'Curator', note: 'Whoever writes the topic pages and keeps opportunity listings alive. Small, named, trusted.' }
    ],
    contentTypes: [
      { name: 'Topics', example: 'Anatomy, viruses, physiology', nature: 'Evergreen. Written once, revised occasionally.', color: 'blue' },
      { name: 'Opportunities', example: 'Research, volunteering, shadowing', nature: 'Perishable. Has a deadline and dies.', color: 'amber' },
      { name: 'Personal materials', example: 'Notes, PDFs, slides, scans', nature: 'Private. Arrives unpredictably, in any shape.', color: 'teal' }
    ],
    thesis: 'One shared vocabulary — body system, discipline and level — that every item of every type must be filed against before it can be saved.',
    thesisWhy: 'If each content type gets its own filing system, the student ends up with three navigations and no way to see that the shadowing listing they just found is in the same specialty as the notes they took last week. That is a disorganised tool no matter how good each silo is.'
  },

  /* ---- Components ------------------------------------------------------- */
  /* layer drives colour; an entity keeps the same colour on every page.     */
  components: [
    {
      id: 'webapp', name: 'Student Web App', layer: 'Screens', kind: 'build', phase: 1,
      does: 'The screen a student actually uses — browse topics, scan opportunities, and keep a personal shelf of notes and PDFs.',
      required: '"high school students and college students", "display different topics", "you can take your own notes"'
    },
    {
      id: 'console', name: 'Curator Console', layer: 'Screens', kind: 'build', phase: 2,
      does: 'A small private screen where whoever maintains the library writes topic pages and posts opportunities with their deadlines.',
      required: '"It should be able to display different topics", "it should list some opportunities" — the content does not write itself'
    },
    {
      id: 'api', name: 'Content API', layer: 'Services', kind: 'build', phase: 1,
      does: 'The server that decides who may see and change what, and the only route through which anything reaches the Spine or the database.',
      required: '"your own notes" — private-per-student content cannot be enforced in the browser'
    },
    {
      id: 'spine', name: 'Taxonomy Service — the Spine', layer: 'Services', kind: 'build', phase: 1, guarantor: true,
      does: 'Owns the one shared list of body systems, disciplines and levels, and refuses to let anything be saved without valid tags.',
      required: '"it should be organized well first" — this is the component that guarantees it'
    },
    {
      id: 'freshness', name: 'Opportunity Freshness Checker', layer: 'Services', kind: 'build', phase: 2,
      does: 'Runs nightly and pulls listings whose deadline has passed, so the opportunity list never shows dead links.',
      required: '"list some opportunities (research, volunteering, shadowing)" + "organized well" — an expired listing is disorganisation'
    },
    {
      id: 'filing', name: 'PDF Filing Assistant', layer: 'Services', kind: 'build', phase: 4, ai: true,
      does: 'Reads an uploaded PDF and suggests which Spine tags it belongs under, so a dropped file never lands untagged.',
      required: '"place pdf’s and other materials" + "organized well first"'
    },
    {
      id: 'db', name: 'Library Database', layer: 'Stores', kind: 'build', phase: 1,
      does: 'Keeps every topic page, opportunity listing, note and tag so they are still there tomorrow, and lets one query pull all three types for the same subject.',
      required: '"take your own notes", "list some opportunities" — state outlives the session'
    },
    {
      id: 'materials', name: 'Material Storage', layer: 'Stores', kind: 'build', phase: 3,
      does: 'Holds the actual uploaded files — PDFs, slides, scans — which are too big to sit inside the database.',
      required: '"place pdf’s and other materials"'
    },
    {
      id: 'accounts', name: 'Accounts and Sign-in', layer: 'Rented', kind: 'third-party', phase: 3,
      does: 'Tells the system which student is asking, so one student’s shelf is never another student’s shelf.',
      required: '"your own notes" — the word "your" implies identity'
    },
    {
      id: 'claude', name: 'Anthropic Claude API', layer: 'Rented', kind: 'third-party', phase: 4, ai: true,
      does: 'The rented model the Filing Assistant asks to match a document against the allowed tag list.',
      required: 'Required by the PDF Filing Assistant only'
    }
  ],

  layers: [
    { id: 'Screens',  label: 'Screens you build',  color: 'blue' },
    { id: 'Services', label: 'Services you build', color: 'teal' },
    { id: 'Stores',   label: 'Where things are kept', color: 'slate' },
    { id: 'Rented',   label: 'Services you rent',  color: 'violet' }
  ],

  aiRationale: {
    claim: 'Only one job in this system needs meaning rather than matching.',
    detail: 'Taking forty pages of a lecture PDF and deciding it belongs under Cardiovascular · Physiology · College is extraction and classification against a fixed vocabulary — the one thing here a rule cannot do. Everything else is storage, retrieval and validation, and is built without a model.',
    guardrail: 'The Assistant suggests; the student confirms. It never writes a tag on its own. Switched off entirely, the system still works — the student tags the upload by hand. The day-one requirement cannot depend on a model call succeeding.'
  },

  /* ---- Deliberately deferred ------------------------------------------- */
  deferred: [
    { id: 'queue', name: 'Job queue for uploads', why: 'At day-one volume, extracting a PDF and getting tag suggestions is a slow request, not a burst. A spinner is an honest answer for a handful of uploads.', trigger: '95th-percentile upload processing passes 30 seconds, or concurrent uploads start colliding' },
    { id: 'search', name: 'Dedicated search engine', why: 'Postgres full-text search covers a few thousand items comfortably.', trigger: 'The library passes ~50,000 items, or search latency passes 300ms' },
    { id: 'ingest', name: 'Opportunity ingestion pipeline', why: 'Curators hand-entering listings is correct while there are dozens.', trigger: 'Listings pass ~200, or more than three partner sources need syncing' },
    { id: 'native', name: 'Native mobile app', why: 'The web app is responsive; a native app buys offline reading and nothing else yet.', trigger: 'Sustained demand for reading without a connection' }
  ],

  /* ---- Diagrams (mermaid source + a plain-English reading) --------------- */
  diagrams: {
    architecture: {
      title: 'How it fits together',
      reading: 'Everything a student or curator writes funnels through the Content API and must clear the Spine before it reaches storage — which is why one subject query can return a topic page, a shadowing listing and a personal PDF together.',
      src: [
        'flowchart TD',
        '    subgraph people["People who use it"]',
        '        Student(["Student, high school or college"])',
        '        Curator(["Curator who maintains the library"])',
        '    end',
        '',
        '    subgraph surfaces["Screens you build"]',
        '        WebApp["Student Web App"]',
        '        Console["Curator Console"]',
        '    end',
        '',
        '    subgraph services["Services you build"]',
        '        API["Content API"]',
        '        Spine["Taxonomy Service, the Spine"]',
        '        Filing["PDF Filing Assistant"]',
        '        Freshness["Opportunity Freshness Checker"]',
        '    end',
        '',
        '    subgraph stores["Where things are kept"]',
        '        LibraryDB[("Library Database, topics opportunities notes and tags")]',
        '        Materials[("Material Storage, uploaded PDFs and slides")]',
        '    end',
        '',
        '    subgraph rented["Services you rent"]',
        '        Accounts{{"Accounts and Sign-in"}}',
        '        ClaudeAPI{{"Anthropic Claude API"}}',
        '    end',
        '',
        '    Student -->|"opens a topic, saves a note, uploads a PDF"| WebApp',
        '    Curator -->|"writes a topic page, posts an opportunity"| Console',
        '    WebApp -->|"signs in, gets a student identity token"| Accounts',
        '    Console -->|"signs in, gets a curator identity token"| Accounts',
        '    WebApp -->|"asks for topics, opportunities and own notes"| API',
        '    Console -->|"submits new topic pages and opportunity listings"| API',
        '    API -->|"every tag on every item, before anything is saved"| Spine',
        '    Spine -->|"tags accepted, or refused with the valid list"| API',
        '    API -->|"reads and writes topics, opportunities, notes and tags"| LibraryDB',
        '    API -->|"stores the uploaded file, gets a link back"| Materials',
        '    API -->|"new upload needs tags"| Filing',
        '    Filing -->|"page text plus the allowed tag list"| ClaudeAPI',
        '    ClaudeAPI -->|"suggested tags"| Filing',
        '    Filing -->|"suggestions for the student to confirm, never auto-saved"| API',
        '    Freshness -->|"nightly sweep for deadlines that have passed"| LibraryDB',
        '    Freshness -->|"confirms retired tags are no longer offered"| Spine',
        '    API -->|"one organised page: topic, matching opportunities, own notes"| WebApp'
      ].join('\n')
    },

    sequence: {
      title: 'One upload, end to end',
      reading: 'Read the vertical lines as components and each arrow as one message; the file is stored early but is not part of the library until the Spine accepts its tags near the bottom.',
      src: [
        'sequenceDiagram',
        '    autonumber',
        '    actor S as Student',
        '    participant W as Student Web App',
        '    participant A as Content API',
        '    participant F as PDF Filing Assistant',
        '    participant C as Claude API',
        '    participant T as Taxonomy Service',
        '    participant M as Material Storage',
        '    participant D as Library Database',
        '    S->>W: Uploads a lecture PDF about the heart',
        '    W->>A: Sends the file with the student identity token',
        '    A->>M: Stores the file and gets a link back',
        '    A->>F: Asks for suggested tags for the new upload',
        '    F->>C: Sends page text plus the allowed tag list',
        '    C-->>F: Returns tags chosen from that list',
        '    F-->>A: Cardiovascular, Physiology, College level',
        '    A-->>W: Shows the suggestions as pre-ticked boxes',
        '    S->>W: Confirms or corrects the tags',
        '    W->>A: Saves the confirmed tags',
        '    A->>T: Checks every tag against the Spine',
        '    T-->>A: Tags accepted',
        '    A->>D: Saves the note record with its tags',
        '    S->>W: Weeks later, opens the Cardiovascular topic',
        '    W->>A: Asks for everything tagged Cardiovascular',
        '    A->>D: One query across topics, opportunities and notes',
        '    D-->>A: Topic page, shadowing listing, the saved PDF',
        '    A-->>W: One organised page',
        '    W-->>S: Own materials and a live opportunity, side by side'
      ].join('\n')
    },

    gantt: {
      title: 'Build order',
      reading: 'Bar length is relative sizing, not a delivery commitment — what matters is the order, because every later phase inherits the vocabulary decided in Phase 1.',
      src: [
        'gantt',
        '    title Build order, and what each phase proves',
        '    dateFormat YYYY-MM-DD',
        '    axisFormat %b %d',
        '    section Phase 1 Spine',
        '    Taxonomy service, database and topic pages :crit, p1, 2026-09-01, 28d',
        '    section Phase 2 Opportunities',
        '    Listings, curator console and nightly freshness :p2, after p1, 21d',
        '    section Phase 3 Personal shelf',
        '    Accounts, file storage, notes and manual tagging :p3, after p2, 28d',
        '    section Phase 4 Filing assistant',
        '    Tag suggestions from uploaded PDFs :p4, after p3, 14d'
      ].join('\n')
    }
  },

  /* ---- Data flow -------------------------------------------------------- */
  flow: [
    { n: 1, actor: 'Student', title: 'The student drops in a PDF', payload: 'lecture handout + identity token', touchesModel: false,
      body: 'They upload a lecture handout on the cardiovascular system from the Student Web App. The app sends the file to the Content API along with the identity token that says which student this is.' },
    { n: 2, actor: 'Content API', title: 'The file is put somewhere durable', payload: 'the file, and a link back', touchesModel: false,
      body: 'The Content API stores the document in Material Storage and gets back a link. Nothing is filed yet — at this moment the upload is a loose file, which is precisely the state the day-one requirement exists to prevent.' },
    { n: 3, actor: 'PDF Filing Assistant', title: 'The Assistant proposes where it belongs', payload: 'page text + the allowed tag list', touchesModel: true,
      body: 'The API hands the new upload to the PDF Filing Assistant, which pulls the page text and sends it to the Claude API together with the Spine’s allowed tag list. The model returns suggestions — Cardiovascular · Physiology · College level — chosen from that list, not invented.' },
    { n: 4, actor: 'Student', title: 'The student confirms', payload: 'pre-ticked tag boxes', touchesModel: true,
      body: 'The suggestions come back to the web app as pre-ticked boxes the student can change. Nothing has been saved to the library yet. If the Filing Assistant is unavailable, this is the step where the student simply picks tags from the dropdown themselves — the journey continues either way.' },
    { n: 5, actor: 'Taxonomy Service', title: 'The Spine has the final say', payload: 'confirmed tags, accepted or refused', touchesModel: false,
      body: 'The confirmed tags go back through the Content API, which checks every one against the Taxonomy Service. Valid tags are accepted; anything unrecognised is refused with the list of what is valid. Only then does the note record land in the Library Database.' },
    { n: 6, actor: 'Library Database', title: 'The organisation pays off later', payload: 'topic page + shadowing listing + the saved PDF', touchesModel: false,
      body: 'Weeks on, the student opens the Cardiovascular topic. The web app makes one request; the API runs one query across all three content types; the page comes back carrying the curated topic page, the cardiology shadowing listing a curator posted last month, and the student’s own PDF from step 1 — together, because all three were filed against the same Spine.' }
  ],

  /* ---- Build order ------------------------------------------------------ */
  phases: [
    { id: 1, name: 'The Spine and the Topic Library', weight: 28, makeOrBreak: true,
      builds: ['spine', 'api', 'db', 'webapp'],
      proves: 'That a single shared vocabulary can hold real medical content and that nothing can be written without valid tags.',
      why: 'If the vocabulary turns out to be wrong-shaped — too coarse, too fine, or the wrong axes — this is the cheapest possible moment to find out, because only one content type exists. Every later phase inherits this decision.' },
    { id: 2, name: 'Opportunities and Freshness', weight: 21, makeOrBreak: false,
      builds: ['console', 'freshness'],
      proves: 'That the same Spine holds a second, structurally different content type without needing a second filing system.',
      why: 'A topic is evergreen; an opportunity has a deadline and dies. If both file cleanly against one vocabulary, the core bet is sound.' },
    { id: 3, name: 'The Personal Shelf', weight: 28, makeOrBreak: false,
      builds: ['accounts', 'materials'],
      proves: 'That student-created content joins the same spine as curated content — and that the payoff arrives.',
      why: 'A topic page can now show a student their own material next to the curated page and a live opportunity. This is the first moment the whole idea is visible on one screen.' },
    { id: 4, name: 'The Filing Assistant', weight: 14, makeOrBreak: false,
      builds: ['filing', 'claude'],
      proves: 'That uploads at volume cannot degrade the organisation.',
      why: 'Last on purpose — it is an accelerant on a system that already works, never a dependency of it.' }
  ],

  /* ---- Assumptions ------------------------------------------------------ */
  assumptions: [
    { id: 1, text: 'One vocabulary — body system, discipline, level — can file all three content types.', severity: 'high',
      impact: 'Foundational. If topics and opportunities need genuinely different axes, the Spine splits into two and the "one organised page" payoff disappears. This is what Phase 1 exists to test.' },
    { id: 2, text: 'Content is curated by a small named group, not crowdsourced from students.', severity: 'medium',
      impact: 'Open contribution needs moderation, reputation and versioning — a whole subsystem this design does not have.' },
    { id: 3, text: 'Students are 13 or older and sign up themselves.', severity: 'high',
      impact: 'Younger students, or school-mediated signup, changes consent handling, account provisioning and possibly adds a teacher audience with its own screens.' },
    { id: 4, text: 'The material is study support, not clinical guidance.', severity: 'high',
      impact: 'If it is ever read as medical advice, a review and approval workflow becomes mandatory before publication.' },
    { id: 5, text: 'Opportunities are hand-entered while there are dozens.', severity: 'low',
      impact: 'Low now, moderate later — it is the trigger for the ingestion pipeline listed as deferred.' },
    { id: 6, text: 'High school and college students share one app, with level as a tag rather than a separate product.', severity: 'medium',
      impact: 'If the two audiences need genuinely different experiences, the Student Web App becomes two surfaces on one API.' }
  ],

  openQuestion: {
    question: 'Is a student here on their own, or is a school putting them here?',
    note: 'Everything else in this blueprint survives either answer. This one does not.',
    branches: [
      { label: 'Self-serve student', tone: 'good', consequences: [
        'The design above is correct as drawn',
        'Accounts are individual, the shelf is private',
        'No third audience, no extra screens',
        'Consent sits with the student or their guardian'
      ]},
      { label: 'School-mediated', tone: 'warn', consequences: [
        'A teacher or counsellor becomes a first-class user',
        'Rosters, assigned reading and progress visibility',
        'A permissions model with cohorts, not just owners',
        'A third screen, and consent moves to the institution'
      ]}
    ]
  },

  /* ---- Coverage --------------------------------------------------------- */
  coverage: [
    { area: 'Browsable topic library', status: 'in', note: 'Phase 1. Curated pages filed against the Spine.' },
    { area: 'Opportunity listings', status: 'in', note: 'Phase 2. Research, volunteering and shadowing, with deadlines.' },
    { area: 'Personal notes and PDF shelf', status: 'in', note: 'Phase 3. Private per student, filed against the same Spine.' },
    { area: 'Enforced organisation on write', status: 'in', note: 'Phase 1. The day-one requirement, owned by the Spine.' },
    { area: 'Assisted tagging of uploads', status: 'in', note: 'Phase 4. Suggestions only; the student confirms.' },
    { area: 'Expired listings removed nightly', status: 'in', note: 'Phase 2. Freshness Checker.' },
    { area: 'Job queue for uploads', status: 'deferred', note: 'Trigger: p95 upload processing past 30s, or concurrent uploads colliding.' },
    { area: 'Dedicated search engine', status: 'deferred', note: 'Trigger: past ~50,000 items or 300ms search latency.' },
    { area: 'Opportunity ingestion pipeline', status: 'deferred', note: 'Trigger: past ~200 listings or more than three partner sources.' },
    { area: 'Native mobile app', status: 'deferred', note: 'Trigger: sustained demand for offline reading.' },
    { area: 'Medical accuracy review workflow', status: 'out', note: 'No editorial approval step. For anatomy and infectious disease taught to students, this gap is real and deserves a decision before launch.' },
    { area: 'Minors’ data protection in depth', status: 'out', note: 'Assumption 3 has been made, not designed for. Retention, parental consent and export rights are unaddressed.' },
    { area: 'Opportunity recommendation by fit', status: 'out', note: 'The system filters by tag; it does not rank against a student’s background or readiness.' },
    { area: 'Progress tracking and assessment', status: 'out', note: 'No streaks, mastery scores, quizzes or completion state. The paragraph asked for organisation, not assessment.' },
    { area: 'Social features', status: 'out', note: 'No sharing, comments, study groups or messaging.' },
    { area: 'Application tracking', status: 'out', note: 'Lists opportunities; does not track what was applied to or heard back about.' },
    { area: 'Offline access', status: 'out', note: 'Requires a connection.' },
    { area: 'Accessibility and localisation depth', status: 'out', note: 'Assumed as build standards, not specified here.' },
    { area: 'Cost, hosting and operations', status: 'out', note: 'No estimate of what running this costs, nor where it runs.' }
  ],

  /* ---- Targets (design intent, not measurements) ------------------------ */
  kpis: [
    { name: 'Items carrying at least one valid Spine tag', target: '100%', note: 'Enforced at the write path, not aspired to. The Spine refuses anything else.' },
    { name: 'Clicks from home to any topic', target: '3 or fewer', note: 'The organisation is only real if it is short.' },
    { name: 'Listings shown past their deadline', target: 'zero', note: 'Owned by the nightly Freshness Checker.' },
    { name: 'Topic pages showing a cross-type link', target: 'every one', note: 'A topic must be able to surface a related opportunity or a personal note — that is the payoff for one shared vocabulary.' }
  ],

  artifacts: [
    { name: 'architecture.md', what: 'The written design: components, diagram, data flow, build order, assumptions, coverage.', path: 'project-blueprint/architecture.md' },
    { name: 'This knowledge base', what: 'Seven browsable sections rendered from one data object, with offline search and an Ask panel.', path: 'project-blueprint/index.html' },
    { name: 'Spine seed vocabulary', what: 'The first list of body systems, disciplines and levels. Phase 1 deliverable — not yet written.', path: 'not yet written' },
    { name: 'Topic page template', what: 'The shape every curated topic follows. Phase 1 deliverable — not yet written.', path: 'not yet written' }
  ],

  /* ---- Sections (drives nav, tiles, prev/next, search tagging) ----------- */
  sections: [
    { id: 'summary',      file: '01-summary.html',      num: '01', name: 'The Idea',
      blurb: 'The paragraph, what it actually asks for, and the one decision everything else follows from.',
      preview: 'pipeline', count: function (b) { return b.idea.contentTypes.length + ' content types'; } },
    { id: 'components',   file: '02-components.html',   num: '02', name: 'Components',
      blurb: 'Every piece, what it does in plain English, and the words in the paragraph that required it.',
      preview: 'layers', count: function (b) { return b.components.length + ' components'; } },
    { id: 'architecture', file: '03-architecture.html', num: '03', name: 'How It Fits Together',
      blurb: 'The wiring diagram — who talks to whom, and what crosses each connection.',
      preview: 'nodegraph', count: function (b) { return b.components.length + ' nodes wired'; } },
    { id: 'flow',         file: '04-data-flow.html',    num: '04', name: 'Data Flow',
      blurb: 'One upload followed end to end, from a dropped PDF to a topic page weeks later.',
      preview: 'ribbon', count: function (b) { return b.flow.length + ' steps'; } },
    { id: 'build',        file: '05-build-order.html',  num: '05', name: 'Build Order',
      blurb: 'Four phases, each defined by what it proves rather than what it contains.',
      preview: 'timeline', count: function (b) { return b.phases.length + ' phases'; } },
    { id: 'assumptions',  file: '06-assumptions.html',  num: '06', name: 'Assumptions',
      blurb: 'What was taken on faith, what it costs if wrong, and the one question that would redraw the design.',
      preview: 'fork', count: function (b) { return b.assumptions.length + ' assumptions'; } },
    { id: 'coverage',     file: '07-coverage.html',     num: '07', name: 'Coverage',
      blurb: 'What this design covers, what is deliberately deferred, and what it honestly does not touch.',
      preview: 'grid', count: function (b) {
        var out = b.coverage.filter(function (c) { return c.status !== 'in'; }).length;
        return out + ' not covered';
      } }
  ]
};
