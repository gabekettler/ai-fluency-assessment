export interface Question {
  id: string;
  text: string;
  why: string;
  strongSignals: string;
  redFlags: string;
}

export interface Tier {
  number: number;
  name: string;
  description: string;
  excelEquivalency: string;
  context: string;
  questions: [Question, Question, Question];
}

export interface RoleExpectation {
  role: string;
  minimumTier: number;
  targetTier: number;
}

export const TIER_LABELS: Record<number, string> = {
  1: "Basic Awareness",
  2: "Active User",
  3: "Proficient Practitioner",
  4: "Advanced / Builder",
  5: "Expert / Architect",
};

export const TIERS: Tier[] = [
  {
    number: 1,
    name: "Basic Awareness",
    description:
      "Has used AI casually. Understands it exists and can do simple tasks.",
    excelEquivalency: "Opening Excel and typing in cells.",
    context:
      "These questions explore your general awareness and experience with AI tools.",
    questions: [
      {
        id: "t1q1",
        text: "What AI tools have you used, and what did you use them for?",
        why: "Establishes baseline. Separates people who have actually used AI from those who have only heard about it. The specificity of their answer reveals real experience vs. bluffing.",
        strongSignals:
          "Names specific tools (ChatGPT, Claude, Copilot, Gemini, Midjourney) and describes concrete use cases: drafting emails, summarizing documents, researching topics, generating first drafts.",
        redFlags:
          'Vague answers like "I\'ve played around with it" with no specifics. Can only name one tool and can\'t describe what they actually did with it.',
      },
      {
        id: "t1q2",
        text: "If you needed to use AI to help you write a professional email to a client, how would you go about it?",
        why: "Tests whether someone understands the basic input-output loop. Can they describe giving instructions to an AI and then reviewing the output?",
        strongSignals:
          "Describes providing context (who the client is, what the email is about, the desired tone), reviewing the draft, and editing before sending. Mentions not blindly copying and pasting.",
        redFlags:
          'Describes just typing "write me an email" with no context. Shows no awareness that output quality depends on input quality. No mention of reviewing or editing.',
      },
      {
        id: "t1q3",
        text: "Have you ever gotten a response from AI that was wrong or unhelpful? What did you do?",
        why: "Tests awareness of AI limitations. Anyone who has used AI more than casually has hit hallucinations or bad outputs. Critical safety question for a construction company where wrong information can have real consequences.",
        strongSignals:
          "Gives a specific example. Describes verifying against other sources, rephrasing their question, or recognizing the AI was fabricating information. Shows healthy skepticism.",
        redFlags:
          "Says they've never had a bad response (meaning they don't verify), or says they just accepted what the AI said. No awareness of hallucination or confabulation.",
      },
    ],
  },
  {
    number: 2,
    name: "Active User",
    description:
      "Understands prompt quality, can iterate, and exercises judgment about when to use AI.",
    excelEquivalency:
      "Using formulas, sorting, and basic formatting in Excel.",
    context:
      "These questions look at how you get results from AI and when you choose to use it.",
    questions: [
      {
        id: "t2q1",
        text: "What's the difference between giving AI a vague instruction versus a detailed prompt? Can you give me an example of each?",
        why: "This is the dividing line between casual users and people who can actually get consistent results. Understanding prompt quality is like understanding the difference between typing a number into Excel and writing a proper formula.",
        strongSignals:
          'Contrasts something like "write a proposal" vs. providing role context, audience, length, format, and examples. Can articulate that specificity drives output quality. May use terms like system prompt, context window, or few-shot examples.',
        redFlags:
          'Can\'t explain the difference or gives a trivial example. Believes AI "just knows" what you want.',
      },
      {
        id: "t2q2",
        text: "Have you ever used AI to help with a multi-step task rather than just a single question? Walk me through how you handled it.",
        why: "Reveals whether someone can manage an ongoing interaction. Multi-turn conversations, iterating on outputs, and building on previous context separates habitual users from one-and-done prompters.",
        strongSignals:
          "Describes a real workflow: researching a topic across multiple prompts, refining a document through several rounds, or breaking a complex task into stages. Shows awareness of context management within a conversation.",
        redFlags:
          "Every example is a single question and single answer. No concept of building on AI responses or iterating.",
      },
      {
        id: "t2q3",
        text: "When would you choose NOT to use AI for a work task?",
        why: "Tests judgment, which is arguably more important than capability. Someone who knows when AI is the wrong tool is more valuable than someone who tries to use it for everything.",
        strongSignals:
          "Identifies scenarios like confidential information, final legal or contractual language, safety-critical calculations, situations requiring human empathy, or tasks where accountability matters. Understands AI as a tool with appropriate and inappropriate uses.",
        redFlags:
          "Says they'd use it for everything, or conversely, says they'd never use it for anything important. No framework for deciding.",
      },
    ],
  },
  {
    number: 3,
    name: "Proficient Practitioner",
    description:
      "Uses AI with documents, custom configurations, and applied problem-solving.",
    excelEquivalency:
      "Pivot tables, VLOOKUP, and custom templates in Excel.",
    context:
      "These questions explore how you use AI with documents, configurations, and real-world problem-solving.",
    questions: [
      {
        id: "t3q1",
        text: "Have you ever attached files or documents to an AI conversation to have it analyze or work with that content? What was the workflow?",
        why: "Separates text-prompt-only users from people who understand AI as a document processing tool. In a construction company, the ability to feed specs, submittals, or spreadsheets into AI is a major productivity lever.",
        strongSignals:
          "Describes uploading PDFs, spreadsheets, images, or reports and asking AI to summarize, extract data, compare, or reformat. Understands file size limits and that AI can read but not always perfectly interpret complex documents.",
        redFlags:
          "Has never attached a file. Doesn't know this is possible. Only types text directly.",
      },
      {
        id: "t3q2",
        text: "Can you explain what a 'system prompt' or 'custom instructions' are and how you've used them?",
        why: "Understanding system-level configuration reveals someone who has moved beyond consumer defaults. This is the equivalent of knowing how to set up custom templates or macros in Excel rather than just using the blank spreadsheet.",
        strongSignals:
          "Explains that system prompts or custom instructions set persistent context, tone, or rules that apply to all interactions. Has configured them for their role, company context, or specific workflows. May reference Claude Projects, GPTs, or custom instructions panels.",
        redFlags:
          "No idea what these are. Has only ever used default settings.",
      },
      {
        id: "t3q3",
        text: "If I asked you to use AI to compare two versions of a contract and summarize the differences, how would you approach that?",
        why: "Tests applied problem-solving with AI as a tool. This is a real-world task at Frontier where comparing specs, change orders, or contracts happens frequently.",
        strongSignals:
          "Describes uploading both documents, giving clear instructions about what types of changes to flag (pricing, scope, dates, liability), structuring the output format, and then verifying key differences manually against the originals.",
        redFlags:
          'Would just paste both documents and say "compare these." No strategy for structuring the request or verifying the output.',
      },
    ],
  },
  {
    number: 4,
    name: "Advanced / Builder",
    description:
      "Understands the AI ecosystem, uses integrations, and builds repeatable workflows.",
    excelEquivalency:
      "Power Query, macros, and cross-application data flows in Excel.",
    context:
      "These questions explore your understanding of AI integrations, the tool landscape, and building repeatable processes.",
    questions: [
      {
        id: "t4q1",
        text: "Have you ever used an AI tool that connects to other software — for example, reading your email, searching your files, or pulling data from a business application? Describe how it worked.",
        why: "Tests awareness of AI integrations and connected tools. It's the line between using AI as a standalone chatbox and understanding it as a component in a larger workflow.",
        strongSignals:
          "Describes tools like Copilot in Outlook/Teams, Claude with MCP connections, AI-powered CRM features, or similar integrations. Understands that AI can read from and sometimes write to other systems. Aware of permission and security considerations.",
        redFlags:
          "No awareness that AI can connect to other tools. Thinks of AI as only a chat window.",
      },
      {
        id: "t4q2",
        text: "What's the difference between ChatGPT, Claude, Copilot, and Gemini? When might you choose one over another?",
        why: "Tests whether someone understands the AI landscape at a practical level. Like knowing when to use Excel vs. Access vs. Power BI, understanding tool selection is critical for getting the best results.",
        strongSignals:
          "Can articulate real differences: context window sizes, writing quality, coding ability, integration ecosystems, pricing models, or privacy policies. Has reasons for preferring certain tools for certain tasks based on actual experience.",
        redFlags:
          "Thinks they're all the same. Has only used one and has no concept that different tools have different strengths. Conflates the brand with the capability.",
      },
      {
        id: "t4q3",
        text: "Have you ever built any kind of repeatable workflow or automation that involves AI — something that runs consistently rather than just one-off conversations?",
        why: "Identifies people who can systematize AI use, not just use it ad hoc. Building repeatable processes is where individual productivity gains become organizational productivity gains.",
        strongSignals:
          "Describes building GPTs/custom bots, automated workflows using Zapier or Make with AI steps, templated prompt libraries, or standardized processes that others on their team now follow. Understands the concept of turning a one-off AI interaction into a reliable process.",
        redFlags:
          "Every interaction is from scratch. No concept of building reusable templates, systems, or automations.",
      },
    ],
  },
  {
    number: 5,
    name: "Expert / Architect",
    description:
      "Can think about AI at a systems level, understands APIs and protocols, and can design AI-integrated business processes.",
    excelEquivalency:
      "VBA development, Power Automate, and enterprise-level Excel architecture.",
    context:
      "These questions explore your technical understanding of AI systems, APIs, and architecture-level thinking.",
    questions: [
      {
        id: "t5q1",
        text: "Can you explain what an API is in the context of AI, and have you ever used one or been involved in setting one up?",
        why: "This is the gateway to technical AI integration. API awareness separates people who use AI through consumer interfaces from people who can help build AI into business processes.",
        strongSignals:
          "Explains APIs as programmatic interfaces that let software talk to AI models directly. May have written scripts, configured API-based tools, built internal applications, or worked with developers to integrate AI into business systems. Understands concepts like tokens, rate limits, and authentication.",
        redFlags:
          "No idea what an API is, or only has a vague textbook definition with no practical understanding.",
      },
      {
        id: "t5q2",
        text: "What does 'MCP' or 'Model Context Protocol' mean to you? Have you worked with any tools that use it?",
        why: "MCP is the emerging standard for connecting AI to external data and tools. Awareness here signals someone who is following the cutting edge of AI infrastructure. Very few people will know this — that's the point.",
        strongSignals:
          "Understands MCP as a protocol that lets AI models connect to external services and data sources in a standardized way. May have configured MCP servers, used Claude with connected tools, or understands the concept of tool-use and function-calling in AI systems.",
        redFlags:
          "This is expected to be unknown to most candidates. Not knowing MCP is not a red flag — it simply confirms the candidate is below Tier 5.",
      },
      {
        id: "t5q3",
        text: "If I told you we wanted to build a system where AI could automatically read incoming project specifications, extract key data points, and populate our estimating database, how would you think about architecting that?",
        why: "This is the ultimate applied question. It tests whether someone can think about AI as a component in a larger system. The answer reveals systems thinking, awareness of integration challenges, and practical understanding of what AI can and can't do reliably at scale.",
        strongSignals:
          "Breaks the problem into components: document ingestion, parsing/extraction prompts, data validation, database integration, error handling, and human review checkpoints. Discusses tradeoffs like accuracy vs. speed, structured vs. unstructured input, and the need for a feedback loop. May reference specific technologies or approaches.",
        redFlags:
          'Describes just pasting specs into ChatGPT. No awareness of reliability, scale, integration, or the difference between a demo and a production system.',
      },
    ],
  },
];

export const ROLE_EXPECTATIONS: RoleExpectation[] = [
  { role: "Administrative / Clerical", minimumTier: 1, targetTier: 2 },
  { role: "Field Supervisors / Foremen", minimumTier: 1, targetTier: 1 },
  { role: "Estimators / Project Managers", minimumTier: 2, targetTier: 3 },
  { role: "Accounting / Finance", minimumTier: 2, targetTier: 3 },
  { role: "Sales / Business Development", minimumTier: 2, targetTier: 3 },
  { role: "Operations / Division Managers", minimumTier: 2, targetTier: 4 },
  { role: "IT / Systems / Analytics", minimumTier: 3, targetTier: 5 },
  { role: "Executive Leadership", minimumTier: 3, targetTier: 4 },
];

// Threshold: tier average must be >= 2.5 to advance to the next tier
export const ADVANCEMENT_THRESHOLD = 2.5;

export const RUBRIC_VERSION = "1.0";
