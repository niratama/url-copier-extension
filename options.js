

document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    localizeHtml();
});
document.getElementById('save-btn').addEventListener('click', saveOptions);
document.getElementById('add-btn').addEventListener('click', addTemplateUI);
document.getElementById('reset-btn').addEventListener('click', resetOptions);

function localizeHtml() {
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        const msg = chrome.i18n.getMessage(key);
        if (msg) elem.textContent = msg;
    });
}

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
      <input type="text" class="name-input" placeholder="${chrome.i18n.getMessage('templateNamePlaceholder')}">
      <textarea class="format-input" placeholder="${chrome.i18n.getMessage('formatPlaceholder')}"></textarea>
    </div>
    <button class="delete">${chrome.i18n.getMessage('deleteBtn')}</button>
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

    try {
        await chrome.storage.sync.set({ templates });

        // Visual feedback
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerText;
        saveBtn.innerText = chrome.i18n.getMessage('savedMsg');
        setTimeout(() => saveBtn.innerText = originalText, 1000);
    } catch (error) {
        console.error('Failed to save options:', error);
        alert(chrome.i18n.getMessage('saveErrorMsg') + error.message);
    }
}

async function resetOptions() {
    if (confirm(chrome.i18n.getMessage('resetConfirmMsg'))) {
        await chrome.storage.sync.set({ templates: DEFAULT_TEMPLATES });
        restoreOptions();
    }
}
