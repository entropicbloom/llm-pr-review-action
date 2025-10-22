const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getChangedFiles() {
  try {
    const baseSha = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
    const diffOutput = execSync(`git diff --name-only ${baseSha} HEAD`, { encoding: 'utf8' });
    return diffOutput.split('\n').filter(file => file && !file.endsWith('.md'));
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

async function getFileDiff(file) {
  try {
    const baseSha = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
    return execSync(`git diff ${baseSha} HEAD -- "${file}"`, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Error getting diff for ${file}:`, error.message);
    return '';
  }
}

async function readExistingDocs() {
  const docs = {};
  const docFiles = execSync('find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"',
    { encoding: 'utf8' }).split('\n').filter(Boolean);

  for (const file of docFiles) {
    try {
      docs[file] = fs.readFileSync(file, 'utf8');
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }
  return docs;
}

async function analyzeChangesAndUpdateDocs() {
  const changedFiles = await getChangedFiles();

  if (changedFiles.length === 0) {
    console.log('No code changes detected.');
    return;
  }

  console.log('Changed files:', changedFiles);

  // Get diffs for changed files
  const changes = [];
  for (const file of changedFiles.slice(0, 10)) { // Limit to first 10 files to avoid token limits
    const diff = await getFileDiff(file);
    if (diff) {
      changes.push({ file, diff });
    }
  }

  // Read existing documentation
  const existingDocs = await readExistingDocs();

  // Build context for Claude
  let context = '## Changed Files and Diffs:\n\n';
  for (const { file, diff } of changes) {
    context += `### ${file}\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
  }

  context += '## Existing Documentation:\n\n';
  for (const [file, content] of Object.entries(existingDocs)) {
    context += `### ${file}\n\`\`\`markdown\n${content}\n\`\`\`\n\n`;
  }

  // Add PR metadata
  context += `## Pull Request Context:\n`;
  context += `Title: ${process.env.PR_TITLE}\n`;
  context += `Description: ${process.env.PR_BODY || 'No description provided'}\n\n`;

  // Call Claude to analyze changes and suggest documentation updates
  console.log('Analyzing changes with Claude...');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${context}

Based on the code changes in this pull request, please update the documentation.

Instructions:
1. Analyze the code changes and determine what documentation needs to be updated
2. For each documentation file that needs changes, provide the COMPLETE updated content
3. If new documentation files should be created, specify the filename and full content
4. Focus on:
   - Updating setup/installation instructions if dependencies changed
   - Documenting new features or functionality
   - Updating API documentation for changed interfaces
   - Adding usage examples for new features
   - Updating configuration instructions
   - Removing documentation for deleted features

Respond in this JSON format:
{
  "updates": [
    {
      "file": "path/to/doc.md",
      "action": "update" or "create",
      "content": "full content of the updated/new file",
      "reason": "brief explanation of why this update is needed"
    }
  ],
  "summary": "Brief summary of documentation changes made"
}

If no documentation updates are needed, return:
{
  "updates": [],
  "summary": "No documentation updates needed for these changes."
}`
    }]
  });

  const responseText = message.content[0].text;
  console.log('Claude response received.');

  // Parse response
  let docUpdates;
  try {
    // Extract JSON from response (in case Claude adds explanation text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      docUpdates = JSON.parse(jsonMatch[0]);
    } else {
      console.error('No JSON found in response');
      return;
    }
  } catch (error) {
    console.error('Error parsing Claude response:', error.message);
    console.error('Response:', responseText);
    return;
  }

  // Apply documentation updates
  if (docUpdates.updates && docUpdates.updates.length > 0) {
    console.log(`Applying ${docUpdates.updates.length} documentation updates...`);

    for (const update of docUpdates.updates) {
      try {
        const filePath = path.resolve(update.file);
        const dir = path.dirname(filePath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write the updated content
        fs.writeFileSync(filePath, update.content, 'utf8');
        console.log(`✓ ${update.action === 'create' ? 'Created' : 'Updated'} ${update.file}`);
        console.log(`  Reason: ${update.reason}`);
      } catch (error) {
        console.error(`Error updating ${update.file}:`, error.message);
      }
    }

    console.log('\nSummary:', docUpdates.summary);
  } else {
    console.log('No documentation updates needed.');
  }
}

analyzeChangesAndUpdateDocs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
