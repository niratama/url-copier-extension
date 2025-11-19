const DEFAULT_TEMPLATES = [
    { id: 'markdown', name: 'Markdown', format: '[{{title}}]({{url}})' },
    { id: 'markdown2', name: 'Markdown 2', format: '{{title}} <{{url}}>' },
    { id: 'html', name: 'HTML', format: '<a href="{{url}}">{{title}}</a>' },
    { id: 'text', name: 'Text', format: '{{title}}\n{{url}}' }
];

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save-btn').addEventListener('click', saveOptions);
document.getElementById('add-btn').addEventListener('click', addTemplateUI);
document.getElementById('reset-btn').addEventListener('click', resetOptions);

async function restoreOptions() {
    const { templates } = await chrome.storage.sync.get('templates');
    const currentTemplates = templates || DEFAULT_TEMPLATES;

    const container = document.getElementById('templates-container');
    container.innerHTML = '';

    currentTemplates.forEach(t => addTemplateUI(null, t));
}

function addTemplateUI(event, template = { name: '', format: '' }) {
    const container = document.getElementById('templates-container');
    const div = document.createElement('div');
    div.className = 'template-item';

    // Create elements programmatically to handle values safely
    div.innerHTML = `
    <div class="template-inputs">
      <input type="text" class="name-input" placeholder="Template Name">
      <textarea class="format-input" placeholder="Format (e.g. [{{title}}]({{url}}))"></textarea>
    </div>
    <button class="delete">Delete</button>
  `;

    // Set values
    div.querySelector('.name-input').value = template.name;
    div.querySelector('.format-input').value = template.format;

    div.querySelector('.delete').addEventListener('click', () => div.remove());
    container.appendChild(div);
}

async function saveOptions() {
    const container = document.getElementById('templates-container');
    const items = container.querySelectorAll('.template-item');
    const templates = [];

    items.forEach((item, index) => {
        const name = item.querySelector('.name-input').value;
        const format = item.querySelector('.format-input').value;
        if (name && format) {
            templates.push({
                id: 'custom_' + Date.now() + '_' + index, // Simple unique ID generation
                name,
                format
            });
        }
    });

    await chrome.storage.sync.set({ templates });

    // Visual feedback
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = 'Saved!';
    setTimeout(() => saveBtn.innerText = originalText, 1000);
}

async function resetOptions() {
    if (confirm('Are you sure you want to reset all templates to default?')) {
        await chrome.storage.sync.set({ templates: DEFAULT_TEMPLATES });
        restoreOptions();
    }
}
