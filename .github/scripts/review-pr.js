const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function githubApiRequest(path, method = 'GET', body = null, customHeaders = {}) {
  const options = {
    hostname: 'api.github.com',
    path: path,
    method: method,
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'PR-Review-Bot',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...customHeaders
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

async function waitForWorkflowCompletion(workflowName, headSha, timeoutMs = 10 * 60 * 1000, pollMs = 10000) {
  const { REPO_OWNER, REPO_NAME } = process.env;
  const deadline = Date.now() + timeoutMs;

  console.log(`Waiting for workflow "${workflowName}" on ${headSha} to complete...`);

  while (Date.now() < deadline) {
    try {
      const runs = await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?head_sha=${headSha}`);
      if (runs && runs.workflow_runs && Array.isArray(runs.workflow_runs)) {
        const run = runs.workflow_runs.find(r => r.name === workflowName);
        if (run) {
          console.log(`Found workflow run: status=${run.status}, conclusion=${run.conclusion}`);
          if (run.status === 'completed') {
            return run.conclusion || 'completed';
          }
        } else {
          console.log('Workflow run not found yet for this SHA.');
        }
      } else {
        console.log('Unexpected response while listing workflow runs.');
      }
    } catch (e) {
      console.log(`Error while polling workflow runs: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, pollMs));
  }

  console.log('Timed out waiting for workflow completion. Proceeding anyway.');
  return 'timeout';
}

async function getPRDiff() {
  const { PR_NUMBER, REPO_OWNER, REPO_NAME } = process.env;
  
  console.log(`Fetching PR #${PR_NUMBER} from ${REPO_OWNER}/${REPO_NAME}`);
  
  try {
    // Get PR details first
    const prPath = `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}`;
    const pr = await githubApiRequest(prPath);
    
    console.log(`PR title: ${pr.title}`);
    console.log(`PR state: ${pr.state}`);
    console.log(`PR head: ${pr.head.sha}`);
    console.log(`PR base: ${pr.base.sha}`);
    console.log(`PR commits: ${pr.commits}`);
    console.log(`PR additions: ${pr.additions}`);
    console.log(`PR deletions: ${pr.deletions}`);
    console.log(`PR changed_files: ${pr.changed_files}`);
    
    // Get the diff directly from GitHub API
    const diffPath = `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}`;
    const diff = await githubApiRequest(diffPath, 'GET', null, {
      'Accept': 'application/vnd.github.v3.diff'
    });
    
    console.log(`Diff length: ${diff && typeof diff === 'string' ? diff.length : (diff ? 'n/a' : 0)} characters`);
    console.log(`Diff type: ${typeof diff}`);
    
    if (diff && typeof diff === 'string') {
      console.log(`Diff preview (first 200 chars): ${diff.substring(0, 200)}`);
    }
    
    return diff;
  } catch (error) {
    console.error('Error fetching PR diff:', error);
    throw error;
  }
}

async function reviewPR() {
  try {
    // Ensure docs workflow has completed for this PR's head SHA before reviewing
    const pr = await githubApiRequest(`/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/pulls/${process.env.PR_NUMBER}`);
    const headSha = pr && pr.head && pr.head.sha ? pr.head.sha : undefined;
    if (headSha) {
      await waitForWorkflowCompletion('Update Documentation', headSha);
    } else {
      console.log('Could not determine head SHA; skipping workflow wait.');
    }

    console.log('Fetching PR diff...');
    const diff = await getPRDiff();

    if (!diff || (typeof diff !== 'string' ? false : diff.trim().length === 0)) {
      console.log('No changes found in PR - this might be a merge commit or the PR has no file changes');
      console.log('Posting informational comment...');
      
      await githubApiRequest(
        `/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/issues/${process.env.PR_NUMBER}/comments`,
        'POST',
        { body: '## 🤖 AI Code Review\n\nNo file changes detected in this PR. This might be a merge commit or the PR contains only metadata changes.' }
      );
      
      console.log('Informational comment posted successfully!');
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
${typeof diff === 'string' ? diff : JSON.stringify(diff, null, 2)}
\`\`\`

Provide a concise review with specific suggestions. Format your response in markdown.`
      }]
    });

    const review = message.content[0].text;

    console.log('Posting review comment...');
    await githubApiRequest(
      `/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/issues/${process.env.PR_NUMBER}/comments`,
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
