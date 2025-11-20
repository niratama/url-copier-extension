// Save options to chrome.storage
async function saveOptions() {
    const templateItems = document.querySelectorAll('.template-item');
    const templates = [];
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('save-btn');

    templateItems.forEach(item => {
        const name = item.querySelector('.template-name').value;
        const format = item.querySelector('.template-format').value;
        const id = item.dataset.id; // Retrieve ID
        if (name && format) {
            templates.push({ id, name, format });
        }
    });

    let slot1TemplateId = document.getElementById('slot1-select').value;
    let slot2TemplateId = document.getElementById('slot2-select').value;

    // Validate slots: if the assigned template is deleted, clear the slot
    if (!templates.find(t => t.id === slot1TemplateId)) {
        slot1TemplateId = '';
    }
    if (!templates.find(t => t.id === slot2TemplateId)) {
        slot2TemplateId = '';
    }

    try {
        await chrome.storage.sync.set({
            templates: templates,
            slot1TemplateId: slot1TemplateId,
            slot2TemplateId: slot2TemplateId
        });

        // Update status to let user know options were saved.
        status.textContent = chrome.i18n.getMessage('savedMsg');
        setTimeout(() => {
            status.textContent = '';
        }, 2000);

        // Refresh slot selects to reflect any name changes
        updateSlotSelects(templates, slot1TemplateId, slot2TemplateId);

    } catch (error) {
        console.error("Error saving options:", error);
        alert(chrome.i18n.getMessage('saveErrorMsg') + error.message);
    }
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
async function restoreOptions() {
    const { templates, slot1TemplateId, slot2TemplateId } = await chrome.storage.sync.get(['templates', 'slot1TemplateId', 'slot2TemplateId']);
    const currentTemplates = templates || DEFAULT_TEMPLATES;

    const list = document.getElementById('template-list');
    list.innerHTML = ''; // Clear existing
    currentTemplates.forEach(template => {
        addTemplateItem(template.name, template.format, template.id);
    });

    updateSlotSelects(currentTemplates, slot1TemplateId, slot2TemplateId);
}

function updateSlotSelects(templates, slot1Id, slot2Id) {
    const slot1Select = document.getElementById('slot1-select');
    const slot2Select = document.getElementById('slot2-select');

    // Helper to populate a select element
    const populate = (select, selectedId) => {
        select.innerHTML = '<option value="">(None)</option>';
        templates.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.name;
            if (t.id === selectedId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    };

    populate(slot1Select, slot1Id);
    populate(slot2Select, slot2Id);
}

function addTemplateItem(name = '', format = '', id = null) {
    const list = document.getElementById('template-list');
    const div = document.createElement('div');
    div.className = 'template-item';
    div.dataset.id = id || crypto.randomUUID(); // Use existing ID or generate new one

    const inputsDiv = document.createElement('div');
    inputsDiv.className = 'template-inputs';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'template-name';
    nameInput.placeholder = chrome.i18n.getMessage('templateNamePlaceholder');
    nameInput.value = name;

    const formatInput = document.createElement('textarea'); // Changed to textarea
    formatInput.className = 'template-format';
    formatInput.placeholder = chrome.i18n.getMessage('formatPlaceholder');
    formatInput.value = format;

    inputsDiv.appendChild(nameInput);
    inputsDiv.appendChild(formatInput);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = chrome.i18n.getMessage('deleteBtn');
    deleteBtn.className = 'delete';
    deleteBtn.onclick = () => {
        list.removeChild(div);
    };

    div.appendChild(inputsDiv);
    div.appendChild(deleteBtn);
    list.appendChild(div);
}

async function resetOptions() {
    if (confirm(chrome.i18n.getMessage('resetConfirmMsg'))) {
        await chrome.storage.sync.set({
            templates: DEFAULT_TEMPLATES,
            slot1TemplateId: '',
            slot2TemplateId: ''
        });
        restoreOptions();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    document.getElementById('save-btn').addEventListener('click', saveOptions);
    document.getElementById('add-btn').addEventListener('click', () => addTemplateItem());
    document.getElementById('reset-btn').addEventListener('click', resetOptions);

    document.getElementById('shortcuts-link').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    // Localization
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const msg = chrome.i18n.getMessage(elem.getAttribute('data-i18n'));
        if (msg) elem.textContent = msg;
    });
});
