# AI-Powered PR Review Bot

Automatically review pull requests using Claude AI from Anthropic.

## Setup

1. **Add Anthropic API Key as a Secret**
   - Go to your repository settings
   - Navigate to **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key (get one from https://console.anthropic.com)

2. **Enable GitHub Actions**
   - The workflow is configured in `.github/workflows/pr-review.yml`
   - It automatically triggers on PR creation and updates

3. **Permissions**
   - The action uses the default `GITHUB_TOKEN` for posting comments
   - No additional permissions needed

## How It Works

When a PR is opened or updated:
1. GitHub Action triggers
2. Fetches the PR diff
3. Sends it to Claude for analysis
4. Posts review as a comment on the PR

The review includes:
- Code quality feedback
- Best practices suggestions
- Potential bugs or issues
- Security concerns
- Performance recommendations

## Customization

Edit `.github/scripts/review-pr.js` to:
- Change the Claude model
- Adjust review criteria
- Modify output format
- Add custom review rules
