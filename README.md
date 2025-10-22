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

> Note: This line is a no-op documentation tweak to trigger CI for testing.

## Features

### PR Review Bot (`.github/workflows/pr-review.yml`)

When a PR is opened or updated:
1. **Waits for documentation updates** - The review bot now waits for the "Update Documentation" workflow to complete before starting the review process
2. Fetches the PR diff
3. Sends it to Claude for analysis
4. Posts review as a comment on the PR

The review includes:
- Code quality feedback
- Best practices suggestions
- Potential bugs or issues
- Security concerns
- Performance recommendations

**Workflow Coordination**: The PR review process includes built-in coordination with the documentation updater to ensure reviews happen after documentation is updated. This prevents race conditions and ensures reviewers see the complete picture including any auto-generated documentation changes.

**Error Handling**: The review bot includes robust error handling for workflow coordination, including timeout handling (10 minutes default) and graceful degradation if the documentation workflow cannot be found or times out.

**Customization**: Edit `.github/scripts/review-pr.js` to adjust review criteria, workflow coordination timeouts, or polling intervals.

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

**Improved Logging**: The documentation updater now provides more detailed logging about the number of changed files and skips processing when no changes are detected, improving workflow efficiency and debugging.

**Customization**: Edit `.github/scripts/update-docs.js` to adjust documentation scope or format.

## Workflow Coordination

The system includes intelligent workflow coordination:

- **Sequential Processing**: The PR review bot waits for documentation updates to complete before performing its analysis
- **Timeout Handling**: Built-in 10-minute timeout for workflow coordination with configurable polling intervals
- **Graceful Degradation**: If documentation workflow completion cannot be determined, the review proceeds anyway
- **Enhanced Error Handling**: Improved error handling and logging for better debugging and monitoring

This ensures that:
1. Documentation is always updated first based on code changes
2. PR reviews include analysis of both code and documentation changes
3. No race conditions occur between the two automated processes
4. The system remains robust even when individual workflows encounter issues