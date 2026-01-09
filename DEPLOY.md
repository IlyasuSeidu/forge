# Deploying Forge to Your GitHub Account

## Quick Setup

### 1. Create a New Repository on GitHub

Go to GitHub and create a new repository named `forge` (or any name you prefer).

**Important**: Do NOT initialize it with README, .gitignore, or license (we already have those).

### 2. Push to Your Repository

From the `forge` directory:

```bash
# If you haven't configured git yet
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/forge.git

# Or using SSH
git remote add origin git@github.com:YOUR_USERNAME/forge.git

# Push to GitHub
git push -u origin main
```

### 3. Verify

Visit `https://github.com/YOUR_USERNAME/forge` to see your repository.

## Repository Structure

Your Forge repository is completely independent from Ralph:

```
forge/                          # Your repository root
├── apps/
│   ├── server/                # Backend API
│   └── web/                   # Future web UI
├── packages/shared/           # Shared code
├── workspaces/                # Generated projects
├── .gitignore
├── README.md
├── GETTING_STARTED.md
└── package.json
```

## What's Committed

- ✅ Complete backend server (TypeScript + Fastify)
- ✅ Domain models (Project, Task, Execution)
- ✅ RESTful API endpoints
- ✅ Service layer architecture
- ✅ Error handling and logging
- ✅ Comprehensive documentation

## What's NOT Committed (Ignored)

- `node_modules/` - Dependencies (reinstall with `npm install`)
- `dist/` - Build output
- `*.log` - Log files
- `workspaces/*` - Generated user projects
- Other temporary files

## Next Steps After Pushing

1. **Set up GitHub Actions** (optional) - Add CI/CD workflows
2. **Configure branch protection** - Protect `main` branch
3. **Add collaborators** - If working with a team
4. **Set up project board** - Track development tasks

## Keeping Ralph as Reference

The Ralph prototype remains in the original `snarktank/ralph` repository.

You can reference it anytime for concepts, but Forge is now your independent production system.

## Troubleshooting

### If remote already exists:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/forge.git
```

### If you need to force push (be careful):
```bash
git push -u origin main --force
```

### To verify your remote:
```bash
git remote -v
```
