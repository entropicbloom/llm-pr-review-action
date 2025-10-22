const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function githubApiRequest(path, method = 'GET', body = null) {
  const options = {
    hostname: 'api.github.com',
    path: path,
    method: method,
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'PR-Review-Bot',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getPRDiff() {
  const { PR_NUMBER, REPO_OWNER, REPO_NAME } = process.env;
  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}`;

  const pr = await githubApiRequest(path);
  const diffUrl = pr.diff_url;

  return new Promise((resolve, reject) => {
    https.get(diffUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

async function reviewPR() {
  try {
    console.log('Fetching PR diff...');
    const diff = await getPRDiff();

    if (!diff || diff.trim().length === 0) {
      console.log('No changes found in PR');
      return;
    }

    console.log('Analyzing PR with Claude...');
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a code reviewer. Please review the following pull request diff and provide constructive feedback. Focus on:
- Code quality and best practices
- Potential bugs or issues
- Security concerns
- Performance improvements
- Readability and maintainability

Here's the diff:

\`\`\`diff
${diff}
\`\`\`

Provide a concise review with specific suggestions. Format your response in markdown.`
      }]
    });

    const review = message.content[0].text;

    console.log('Posting review comment...');
    const { PR_NUMBER, REPO_OWNER, REPO_NAME } = process.env;
    await githubApiRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments`,
      'POST',
      { body: `## 🤖 AI Code Review\n\n${review}` }
    );

    console.log('Review posted successfully!');
  } catch (error) {
    console.error('Error reviewing PR:', error);
    process.exit(1);
  }
}

reviewPR();
