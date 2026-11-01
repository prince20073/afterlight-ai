// AFTERLIGHT — local AI ghost story generator
// Requires Ollama running locally. Default model: llama3.2
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'llama3.2'; // Change this to any model you have pulled in Ollama.

const seedInput = document.getElementById('seed');
const moodSelect = document.getElementById('mood');
const lengthSelect = document.getElementById('length');
const generateBtn = document.getElementById('generateBtn');
const buttonText = document.getElementById('buttonText');
const storyOutput = document.getElementById('storyOutput');
const storyStatus = document.getElementById('storyStatus');
const connectionLabel = document.getElementById('connectionLabel');
const charCount = document.getElementById('charCount');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

let currentStory = '';

seedInput.addEventListener('input', () => {
  charCount.textContent = `${seedInput.value.length} / 700`;
});

async function checkLocalModel() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) throw new Error('Ollama is not responding');
    const data = await response.json();
    const models = (data.models || []).map(model => model.name);
    const hasModel = models.some(name => name === MODEL_NAME || name.startsWith(`${MODEL_NAME}:`));
    connectionLabel.textContent = hasModel ? `LOCAL MODEL · ${MODEL_NAME.toUpperCase()}` : 'OLLAMA CONNECTED · MODEL MISSING';
    connectionLabel.style.color = hasModel ? '#a9bd96' : '#c6a875';
  } catch (error) {
    connectionLabel.textContent = 'LOCAL MODEL · OFFLINE';
    connectionLabel.style.color = '#c58d83';
  }
}

function makePrompt(seed, mood, length) {
  return `You are the story keeper of AFTERLIGHT, an atmospheric literary horror archive. Write an original ghost story based on the user's seed.\n\nSEED: ${seed}\nATMOSPHERE: ${mood}\nLENGTH: ${length}\n\nWriting rules:\n- Give the story a short, evocative title on the first line.\n- Build suspense through sensory details, silence, and implication rather than cheap jump scares.\n- Keep the story emotionally resonant and coherent, with a memorable final image.\n- Do not claim the story is a true account.\n- Do not explain your process or add commentary. Output only the title and story.`;
}

function showError(message) {
  storyOutput.innerHTML = `<div class="empty-state"><div class="moon">☾</div><p class="empty-title">The signal faded.</p><p class="empty-copy">${message}</p><div class="empty-rule"></div><span>CHECK YOUR LOCAL SETUP</span></div>`;
  storyStatus.textContent = 'CONNECTION INTERRUPTED';
}

generateBtn.addEventListener('click', async () => {
  const seed = seedInput.value.trim();
  if (!seed) {
    seedInput.focus();
    seedInput.placeholder = 'Leave a detail here first...';
    return;
  }

  generateBtn.disabled = true;
  buttonText.textContent = 'LISTENING TO THE DARK…';
  storyStatus.textContent = 'A STORY IS TAKING SHAPE';
  storyOutput.innerHTML = '<div class="empty-state"><div class="moon">☾</div><p class="empty-title">Something is stirring.</p><p class="empty-copy">The local model is gathering the pieces. This may take a little while on the first run.</p><div class="empty-rule"></div><span>PLEASE WAIT</span></div>';
  copyBtn.disabled = true;
  downloadBtn.disabled = true;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: makePrompt(seed, moodSelect.value, lengthSelect.value),
        stream: false,
        options: { temperature: 0.85, top_p: 0.92 }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama returned ${response.status}. ${detail.slice(0, 160)}`);
    }

    const data = await response.json();
    currentStory = (data.response || '').trim();
    if (!currentStory) throw new Error('The model returned an empty response. Try again.');

    const lines = currentStory.split('\n');
    const title = lines.shift().replace(/^#+\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    const body = lines.join('\n').trim();
    storyOutput.innerHTML = '';
    const titleElement = document.createElement('h3');
    titleElement.className = 'story-title';
    titleElement.textContent = title || 'A story from the dark';
    const bodyElement = document.createElement('p');
    bodyElement.className = 'story-text';
    bodyElement.textContent = body || currentStory;
    storyOutput.append(titleElement, bodyElement);
    storyStatus.textContent = 'SIGNAL RECEIVED · STORED IN THIS SESSION';
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  } catch (error) {
    console.error(error);
    if (error instanceof TypeError) {
      showError('Could not reach Ollama at localhost:11434. Start Ollama and allow this page to connect to it.');
    } else {
      showError(error.message || 'Something went wrong while generating the story.');
    }
    currentStory = '';
  } finally {
    generateBtn.disabled = false;
    buttonText.textContent = 'SUMMON A STORY';
  }
});

copyBtn.addEventListener('click', async () => {
  if (!currentStory) return;
  try {
    await navigator.clipboard.writeText(currentStory);
    copyBtn.textContent = 'COPIED ✓';
    setTimeout(() => { copyBtn.textContent = 'COPY'; }, 1600);
  } catch {
    copyBtn.textContent = 'COPY BLOCKED';
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentStory) return;
  const blob = new Blob([currentStory], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'afterlight-story.txt';
  link.click();
  URL.revokeObjectURL(url);
});

checkLocalModel();
