# 🤝 Contributing to TechRadar-Agent

Thank you for your interest in contributing to **TechRadar-Agent**! We welcome bug fixes, documentation enhancements, new crawler tasks, and architectural improvements.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: `>= 20.0.0` (Node 22 LTS recommended)
- **Package Manager**: [pnpm](https://pnpm.io/) (`>= 9.0.0` or `10.x`)
- **Git**

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/dora-exploreLab/tech-radar-agent.git
   cd tech-radar-agent
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings (e.g. LLM_API_KEY, STORAGE_DRIVER)
   ```

4. **Run in Development Mode**
   ```bash
   pnpm dev status
   pnpm dev run
   ```

---

## 🧪 Testing & Verification

Before submitting a Pull Request, please ensure all checks pass:

```bash
# 1. Static TypeScript Check
pnpm typecheck

# 2. Build Bundle
pnpm build

# 3. Unit & Integration Tests
pnpm test
```

---

## 🧩 How to Add a New Task Plugin

TechRadar-Agent is designed with pluggability in mind. Adding a new intelligence source takes only 3 steps:

1. **Create Task Implementation** in `src/tasks/your_task.ts`:
   Extend `BaseTask` and implement `execute(context: RuntimeContext)` using `this.harness.act()`.
2. **Register Task in Agent** in `src/core/agent.ts`:
   Add your new task instance to the `TaskPipeline`.
3. **Add Environment Switch** in `src/config/index.ts` and `.env.example`.

---

## 📜 Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature or crawler task
- `fix:` A bug fix
- `docs:` Documentation improvements
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `test:` Adding or improving tests
- `chore:` Maintenance tasks, dependency updates, CI workflows

---

## 🚀 Pull Request Process

1. Create a feature branch: `git checkout -b feat/your-feature-name`
2. Commit your changes: `git commit -m "feat: add support for HackerNews trending"`
3. Push to your fork: `git push -u origin feat/your-feature-name`
4. Open a Pull Request on GitHub against the `main` branch.