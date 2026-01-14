# Forge Frontend (Next.js)

**Agent-centric UI for non-developers**

This is the production Next.js frontend for Forge, designed to make the 17-agent assembly line visible, understandable, and trustworthy for non-developers.

---

## Philosophy

This frontend is **NOT a dashboard**.
This is a **home** for people building software without fear.

### Core Principles

1. **Forge never decides — it shows** - UI never says "Forge chose…", always "Here is what will happen"
2. **Progress is visual, not verbal** - Timelines, states, locks, approvals (not paragraphs)
3. **Every irreversible step requires the user** - Code changes, money, finalizations → explicit approval
4. **No agent is hidden** - Visible purpose, inputs, outputs, limits
5. **Incremental build only** - One agent at a time, never refactor wholesale

---

## Getting Started

### Installation

```bash
cd apps/web-next
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Current Status (Phase 1)

✅ **Implemented**:
- Agent Timeline (PRIMARY navigation)
- Project layout with 17 visible agents
- Foundry Architect UI (Agent 1)
- Approval flow with hash-locking

🚧 **To Do**: Agents 2-17 (one per PR)

---

See [FRONTEND_ARCHITECTURE.md](../../docs/FRONTEND_ARCHITECTURE.md) for full documentation.
