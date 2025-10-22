# AI-Powered GitHub Actions

This repository contains AI-powered GitHub Actions using Claude AI from Anthropic:

1. **PR Review Bot** - Automatically reviews pull requests for code quality, bugs, and best practices
2. **Documentation Updater** - Automatically updates documentation based on PR changes

## Setup

1. **Add Anthropic API Key as a Secret**
   - Go to your repository settings
   - Navigate to **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key (get one from https://console.anthropic.com)

2. **Enable GitHub Actions**
   - Workflows are configured in `.github/workflows/`
   - They automatically trigger on PR creation and updates

3. **Permissions**
   - The actions use the default `GITHUB_TOKEN`
   - No additional permissions needed

## Features

### PR Review Bot (`.github/workflows/pr-review.yml`)

When a PR is opened or updated:
1. Fetches the PR diff
2. Sends it to Claude for analysis
3. Posts review as a comment on the PR

The review includes:
- Code quality feedback
- Best practices suggestions
- Potential bugs or issues
- Security concerns
- Performance recommendations

**Customization**: Edit `.github/scripts/review-pr.js` to adjust review criteria.

### Documentation Updater (`.github/workflows/update-docs.yml`)

When a PR is opened or updated:
1. Analyzes code changes in the PR
2. Reads existing documentation files
3. Uses Claude to determine what docs need updating
4. Automatically updates or creates documentation files
5. Commits changes back to the PR branch

The updater handles:
- README updates for new features
- API documentation changes
- Configuration instruction updates
- Usage examples for new functionality
- Setup/installation instruction changes

**Customization**: Edit `.github/scripts/update-docs.js` to adjust documentation scope or format.
