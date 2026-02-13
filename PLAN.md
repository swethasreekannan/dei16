# Marketing Delivery Engine (MDE) — Architecture Plan

## Vision
An AI-powered delivery engine for marketing agencies. Each client is a **project** with ingested brand DNA. Specialized agents collaborate to produce high-quality, brand-aligned collateral — not AI slop, but work that wows.

---

## 1. Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Web App                        │
│  (Project Dashboard / Brand Upload / Job Queue / Review) │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│               Orchestration Layer (Python)                │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Creative  │  │ Content  │  │ Design   │  ... more    │
│  │ Director  │  │ Writer   │  │ Agent    │   agents     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                     │
│       ▼              ▼              ▼                     │
│  ┌─────────────────────────────────────────────┐        │
│  │           MCP Tool Layer                     │        │
│  │  Figma │ PPTX │ Image │ Browser │ Files     │        │
│  └─────────────────────────────────────────────┘        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Brand Knowledge Base (RAG)                   │
│  Per-client: brand guidelines, tone, assets, colors,     │
│  fonts, examples, website content, uploaded docs          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Frontend (Web Dashboard)
- **Next.js 14+ (App Router)** — Project management, file uploads, job queue, review UI
- **Tailwind CSS + shadcn/ui** — Clean, fast UI
- **Uploadthing or S3** — File uploads (PDFs, images, docs, decks)

### Backend / Orchestration
- **Python (FastAPI)** — Agent orchestration server
- **Claude API (claude-sonnet-4-5-20250929 / claude-opus-4-6)** — LLM backbone for all agents
- **Anthropic Agent SDK (Python)** — For building multi-agent workflows with handoffs
- **PostgreSQL + pgvector** — Project data + vector embeddings for brand RAG
- **Redis** — Job queue, caching

### MCP Servers (Tools the agents use)
| MCP Server | Purpose |
|---|---|
| **Filesystem MCP** | Read/write project files, exports |
| **Figma MCP** | Create/edit Figma designs programmatically |
| **Browser MCP (Puppeteer/Playwright)** | Scrape client websites for brand extraction |
| **Image Generation MCP** | Wraps DALL-E 3 / Flux / Ideogram for on-brand visuals |
| **python-pptx MCP** | Build PowerPoint decks (L1/L2/L3 quality tiers) |
| **PDF MCP** | Parse brand guideline PDFs, generate one-pagers |
| **Video MCP (Remotion/FFmpeg)** | Generate brand-aligned video content |
| **Social Media MCP** | Format + export for platform specs (IG, LinkedIn, X, TikTok) |
| **Google Slides MCP** | Alternative deck creation via Google Workspace |
| **Excel/CSV MCP** | Parse uploaded data files |

---

## 3. Agent System Design

### The Agent Roster

#### 🎬 Creative Director Agent
- **Role**: Orchestrator. Receives briefs, breaks them into tasks, assigns to specialist agents, reviews output quality.
- **Model**: claude-opus-4-6 (needs highest reasoning for creative judgment)
- **Capabilities**:
  - Interprets client briefs and project context
  - Creates creative strategy and direction
  - Routes tasks to specialist agents
  - Reviews ALL output before delivery (quality gate)
  - Requests revisions with specific feedback
  - Ensures brand alignment across all deliverables

#### ✍️ Content Writer Agent
- **Role**: All copy — headlines, body text, social captions, deck copy, one-pager text, scripts
- **Model**: claude-sonnet-4-5-20250929 (fast, excellent at writing)
- **Capabilities**:
  - Writes in the client's brand voice (extracted from RAG)
  - Adapts tone per platform (LinkedIn formal vs. TikTok casual)
  - Generates multiple variants for A/B testing
  - Headlines, taglines, CTAs, long-form, scripts
- **Tools**: Brand RAG lookup, Social Media MCP (for platform constraints)

#### 🎨 Design Agent
- **Role**: Visual design — layouts, graphics, social media visuals, one-pagers
- **Model**: claude-sonnet-4-5-20250929 + Image Generation MCP
- **Capabilities**:
  - Generates design briefs with exact specs (colors, fonts, layout)
  - Creates visuals via image generation (on-brand, not generic)
  - Designs social media posts with proper dimensions
  - Creates one-pager layouts
  - Outputs to Figma for team refinement
- **Tools**: Figma MCP, Image Generation MCP, Brand RAG

#### 📊 Deck Architect Agent
- **Role**: Presentation specialist — PowerPoint and Google Slides
- **Model**: claude-sonnet-4-5-20250929
- **Capabilities**:
  - **L1 (Brand Aligned)**: Correct colors, fonts, logo placement, clean layouts
  - **L2 (Transitions)**: L1 + slide transitions, build animations, progressive reveals
  - **L3 (Beautiful Animations)**: L2 + custom animations, motion graphics, cinematic feel
  - Builds master templates per client
  - Generates speaker notes
- **Tools**: python-pptx MCP, Google Slides MCP, Brand RAG

#### 🎥 Video Producer Agent
- **Role**: Video content — social video, explainers, reels, GIFs
- **Model**: claude-sonnet-4-5-20250929
- **Capabilities**:
  - Generates video scripts and storyboards
  - Creates videos using Remotion (React-based video)
  - Produces GIFs from video segments
  - Handles aspect ratios per platform
  - Adds branded intros/outros, lower thirds
- **Tools**: Video MCP (Remotion/FFmpeg), Image Generation MCP, Brand RAG

#### 🌐 Brand Analyst Agent
- **Role**: Ingests and understands everything about the client's brand
- **Model**: claude-sonnet-4-5-20250929
- **Capabilities**:
  - Parses brand guideline PDFs → extracts colors, fonts, tone, dos/don'ts
  - Scrapes client website → extracts visual style, messaging patterns
  - Processes uploaded docs (decks, excels, PDFs) → builds brand knowledge
  - Maintains and updates the brand vector store
  - Answers questions from other agents about brand rules
- **Tools**: PDF MCP, Browser MCP, Excel/CSV MCP, Brand RAG (write access)

---

## 4. Quality System (Anti-Slop Architecture)

This is the most critical part. AI slop happens when there's no taste filter. Our system has **three layers of quality control**:

### Layer 1: Brand RAG Grounding
- Every agent query includes retrieved brand context
- Color codes, font names, tone examples, visual references
- Agents never hallucinate brand details — they look them up

### Layer 2: Creative Director Review Loop
```
Brief → Creative Director breaks into tasks
  → Specialist agents produce drafts
    → Creative Director reviews each output
      → APPROVED: moves to delivery queue
      → REVISION: sends back with specific feedback (up to 3 rounds)
      → REJECTED: reassigns with new direction
```

### Layer 3: Human-in-the-Loop Review
- All outputs land in a **Review Queue** in the dashboard
- Team members approve, request changes, or reject
- Feedback is fed back to agents for learning (per-project context)

### Quality Signals
- Brand color accuracy check (hex code matching)
- Tone consistency scoring (compare against brand voice examples)
- Layout quality heuristics (whitespace, alignment, hierarchy)
- Platform spec compliance (dimensions, file size, character limits)

---

## 5. Project Structure

```
dei16/
├── frontend/                    # Next.js web dashboard
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── projects/        # Client project management
│   │   │   ├── jobs/            # Job queue and status
│   │   │   └── review/          # Review queue for outputs
│   │   ├── api/                 # API routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── brand-upload/        # Brand guideline upload UI
│   │   ├── brief-builder/       # Create delivery briefs
│   │   ├── review-panel/        # Review and approve outputs
│   │   └── ui/                  # shadcn components
│   └── lib/
│       ├── api-client.ts        # Backend API client
│       └── stores/              # Zustand state management
│
├── backend/                     # Python FastAPI orchestration
│   ├── api/
│   │   ├── routes/
│   │   │   ├── projects.py      # CRUD for client projects
│   │   │   ├── briefs.py        # Brief submission
│   │   │   ├── jobs.py          # Job queue management
│   │   │   └── review.py        # Review queue
│   │   └── main.py              # FastAPI app
│   ├── agents/
│   │   ├── creative_director.py # Orchestrator agent
│   │   ├── content_writer.py    # Copy specialist
│   │   ├── designer.py          # Visual design agent
│   │   ├── deck_architect.py    # PPT/Slides specialist
│   │   ├── video_producer.py    # Video/GIF agent
│   │   ├── brand_analyst.py     # Brand ingestion agent
│   │   └── base.py              # Base agent class with brand RAG
│   ├── mcp_servers/
│   │   ├── figma_server.py      # Figma MCP server
│   │   ├── pptx_server.py       # PowerPoint MCP server
│   │   ├── image_gen_server.py  # Image generation MCP server
│   │   ├── video_server.py      # Remotion/FFmpeg MCP server
│   │   ├── browser_server.py    # Web scraping MCP server
│   │   ├── pdf_server.py        # PDF parse/generate MCP server
│   │   ├── social_server.py     # Social media format MCP server
│   │   └── excel_server.py      # Excel/CSV MCP server
│   ├── brand/
│   │   ├── ingestion.py         # Brand asset processing pipeline
│   │   ├── rag.py               # Vector store + retrieval
│   │   └── validator.py         # Brand compliance checking
│   ├── models/
│   │   ├── project.py           # Project/client model
│   │   ├── brief.py             # Brief/job model
│   │   └── deliverable.py       # Output deliverable model
│   └── config/
│       └── settings.py          # Environment config
│
├── shared/                      # Shared types/schemas
│   └── schemas/
│       ├── project.py
│       ├── brief.py
│       └── deliverable.py
│
├── docker-compose.yml           # PostgreSQL, Redis, app services
├── pyproject.toml               # Python dependencies
├── package.json                 # Root package.json for monorepo
└── README.md
```

---

## 6. Workflow Example

**Scenario**: Client "Acme Corp" needs 5 LinkedIn posts, a sales one-pager, and a 10-slide pitch deck (L2 quality).

```
1. User creates brief in dashboard:
   - Project: Acme Corp
   - Deliverables: 5x LinkedIn posts, 1x one-pager, 1x deck (L2, 10 slides)
   - Context: "Product launch for AcmeWidget 3.0, targeting enterprise CTOs"

2. Creative Director Agent receives brief:
   - Pulls Acme Corp brand context from RAG
   - Creates creative strategy: key messages, visual direction, tone
   - Assigns tasks:
     → Content Writer: 5 LinkedIn posts + one-pager copy + deck copy
     → Designer: one-pager layout + LinkedIn post graphics
     → Deck Architect: 10-slide deck with L2 animations

3. Agents work (can parallelize independent tasks):
   - Content Writer produces copy drafts (brand voice from RAG)
   - Designer creates visual layouts (brand colors/fonts from RAG)
   - Deck Architect builds slide structure

4. Creative Director reviews:
   - Checks brand alignment, quality, creativity
   - Sends LinkedIn post #3 back for revision (too generic)
   - Approves everything else

5. Outputs appear in Review Queue:
   - Team reviews in dashboard
   - Downloads PPTX, PNG, copy text
   - Requests one final tweak to deck slide 7

6. Delivery complete.
```

---

## 7. Implementation Phases

### Phase 1: Foundation (What we build first)
- [ ] Project structure + monorepo setup
- [ ] Database schema (projects, briefs, deliverables)
- [ ] Brand ingestion pipeline (PDF parsing → vector store)
- [ ] Base agent framework with Anthropic SDK
- [ ] Brand Analyst Agent (ingest brand guidelines)
- [ ] Content Writer Agent (text deliverables)
- [ ] Creative Director Agent (orchestration + review)
- [ ] Basic dashboard (projects, upload, brief submission)

### Phase 2: Visual Delivery
- [ ] Design Agent + Image Generation MCP
- [ ] Deck Architect Agent + python-pptx MCP
- [ ] One-pager generation
- [ ] Social media post formatting
- [ ] Review queue in dashboard

### Phase 3: Rich Media
- [ ] Video Producer Agent + Remotion MCP
- [ ] GIF generation
- [ ] Figma MCP integration
- [ ] Google Slides MCP

### Phase 4: Polish
- [ ] Quality scoring system
- [ ] Template library per client
- [ ] Batch job processing
- [ ] Export/download center
- [ ] Team collaboration features

---

## 8. Key Dependencies

### Python (backend)
- `anthropic` — Claude API + Agent SDK
- `fastapi` + `uvicorn` — API server
- `python-pptx` — PowerPoint generation
- `chromadb` or `pgvector` — Vector store for brand RAG
- `pypdf2` / `pdfplumber` — PDF parsing
- `pillow` — Image processing
- `playwright` — Web scraping for brand extraction
- `remotion` (via subprocess) — Video generation
- `mcp` — Model Context Protocol SDK

### Node.js (frontend)
- `next` — Next.js framework
- `tailwindcss` — Styling
- `shadcn/ui` — Component library
- `zustand` — State management
- `uploadthing` or `@aws-sdk/client-s3` — File uploads
- `react-query` — API data fetching

---

## 9. What Makes This NOT Slop

1. **Brand DNA is mandatory** — No agent produces anything without brand context loaded
2. **Creative Director is the taste filter** — Uses Opus-level reasoning to judge quality
3. **Revision loops** — Nothing ships on first draft; agents iterate
4. **Specific over generic** — Agents are prompted with concrete examples from the client's own materials, not generic marketing language
5. **Human review is non-negotiable** — AI produces, humans approve
6. **Per-client templates** — Once good work is approved, it becomes a template for that client's future work
7. **Platform-native output** — Not screenshots of text, but actual PPTX files, actual Figma components, actual video files
