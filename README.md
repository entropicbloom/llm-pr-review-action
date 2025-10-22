# AI-Powered PR Review Bot 🤖

Automatically review pull requests using Claude AI from Anthropic. Get instant, intelligent code reviews on every PR!

## 🚀 Quick Start

### Prerequisites
- A GitHub repository
- An Anthropic API key ([Get one here](https://console.anthropic.com))

### Setup

1. **Add Anthropic API Key as a Secret**
   - Go to your repository settings
   - Navigate to **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key

2. **Enable GitHub Actions**
   - The workflow is configured in `.github/workflows/pr-review.yml`
   - It automatically triggers on PR creation and updates

3. **Permissions**
   - The action uses the default `GITHUB_TOKEN` for posting comments
   - No additional permissions needed

## ⚙️ How It Works

When a PR is opened or updated:
1. 🎯 GitHub Action triggers automatically
2. 📥 Fetches the PR diff and metadata
3. 🤖 Sends it to Claude AI for intelligent analysis
4. 💬 Posts comprehensive review as a comment on the PR

### What You Get
The AI review includes:
- ✅ **Code Quality** - Style, structure, and maintainability
- 🛡️ **Security** - Potential vulnerabilities and best practices
- 🚀 **Performance** - Optimization opportunities
- 🐛 **Bug Detection** - Potential issues and edge cases
- 📚 **Best Practices** - Language-specific recommendations

## 🛠️ Customization

Edit `.github/scripts/review-pr.js` to:
- 🔄 Change the Claude model (e.g., claude-3-5-sonnet-20241022)
- ⚙️ Adjust review criteria and focus areas
- 🎨 Modify output format and styling
- 📋 Add custom review rules and guidelines
- 🌍 Set language-specific preferences

## 📝 Example Output

The bot will post comments like:
```
🤖 **AI Code Review**

**Overall Assessment:** ✅ Good changes with minor suggestions

**Issues Found:**
- Consider adding error handling for the API call
- Missing JSDoc comments for the new function

**Suggestions:**
- Use const instead of let for variables that don't change
- Consider extracting the validation logic into a separate function
```

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
