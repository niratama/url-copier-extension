const sourceTabId = Number(new URLSearchParams(location.search).get('sourceTabId'));
const sourceWindowId = Number(new URLSearchParams(location.search).get('sourceWindowId'));
const currentTabBtn = document.getElementById('current-tab-btn');
const allTabsBtn = document.getElementById('all-tabs-btn');
const optionsBtn = document.getElementById('options-btn');
const copyTargetTabs = document.getElementById('copy-target-tabs');
const paletteList = document.getElementById('palette-list');
const paletteMessage = document.getElementById('palette-message');

let templates = [];
let selectedIndex = 0;
let copyMode = 'current';

document.title = chrome.i18n.getMessage('actionTitle') || 'URL Copier';
document.documentElement.lang = chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';

// Localization for data-i18n attributes
document.querySelectorAll('[data-i18n]').forEach(elem => {
    const msg = chrome.i18n.getMessage(elem.getAttribute('data-i18n'));
    if (msg) elem.textContent = msg;
});

currentTabBtn.textContent = chrome.i18n.getMessage('currentTabBtn') || 'Current Tab';
allTabsBtn.textContent = chrome.i18n.getMessage('copyAllTabs') || 'Copy All Tabs';
optionsBtn.textContent = chrome.i18n.getMessage('openOptionsBtn') || 'Options';
copyTargetTabs.setAttribute('aria-label', chrome.i18n.getMessage('copyTargetTablistLabel') || 'Select copy target');
paletteList.setAttribute('aria-label', chrome.i18n.getMessage('templateListLabel') || 'Template list');

currentTabBtn.addEventListener('click', () => setCopyMode('current'));
allTabsBtn.addEventListener('click', () => setCopyMode('all'));
optionsBtn.addEventListener('click', openOptions);

document.addEventListener('keydown', handleKeyDown, { capture: true });
document.addEventListener('click', (event) => {
    const item = event.target.closest('.item');
    if (item) {
        const index = Number(item.dataset.index);
        selectTemplate(index);
    }
});

initialize();

async function initialize() {
    const { templates: storedTemplates } = await chrome.storage.sync.get(['templates']);
    templates = storedTemplates || DEFAULT_TEMPLATES;

    if (!Number.isFinite(sourceTabId) || sourceTabId <= 0) {
        showMessage(chrome.i18n.getMessage('paletteSourceTabError') || 'Could not determine the source tab.');
        return;
    }

    if (!templates.length) {
        showMessage(chrome.i18n.getMessage('paletteNoTemplates') || 'No templates found.');
        return;
    }

    renderTemplates();
}

function renderTemplates() {
    paletteList.innerHTML = '';
    paletteMessage.hidden = true;

    templates.forEach((template, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'item';
        button.dataset.index = String(index);
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', index === selectedIndex ? 'true' : 'false');
        if (index === selectedIndex) {
            button.classList.add('selected');
        }

        const key = document.createElement('span');
        key.className = 'key';
        key.textContent = index < 9 ? String(index + 1) : '•';

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = template.name;

        const format = document.createElement('span');
        format.className = 'format';
        format.textContent = template.format;

        button.appendChild(key);
        button.appendChild(name);
        button.appendChild(format);

        button.addEventListener('mouseenter', () => setSelectedIndex(index));

        paletteList.appendChild(button);
    });
}

function setSelectedIndex(nextIndex) {
    if (!templates.length) {
        return;
    }

    const normalizedIndex = ((nextIndex % templates.length) + templates.length) % templates.length;
    const buttons = paletteList.querySelectorAll('.item');
    buttons[selectedIndex]?.classList.remove('selected');
    buttons[selectedIndex]?.setAttribute('aria-selected', 'false');
    selectedIndex = normalizedIndex;
    buttons[selectedIndex]?.classList.add('selected');
    buttons[selectedIndex]?.setAttribute('aria-selected', 'true');
    buttons[selectedIndex]?.scrollIntoView({ block: 'nearest' });
}

async function selectTemplate(index) {
    const template = templates[index];
    if (!template) {
        return;
    }

    const response = copyMode === 'all'
        ? await chrome.runtime.sendMessage({
            type: 'copy-all-tabs',
            templateId: template.id,
            sourceWindowId
        })
        : await chrome.runtime.sendMessage({
            type: 'copy-template',
            templateId: template.id,
            sourceTabId
        });

    if (response && response.success) {
        window.close();
    } else {
        showMessage(chrome.i18n.getMessage('copyErrorMsg') || 'Failed to copy to clipboard.');
    }
}

async function openOptions() {
    if (chrome.runtime.openOptionsPage) {
        await chrome.runtime.openOptionsPage();
    } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
    window.close();
}

function setCopyMode(nextMode) {
    copyMode = nextMode;
    const isCurrent = nextMode === 'current';

    currentTabBtn.classList.toggle('active', isCurrent);
    currentTabBtn.setAttribute('aria-selected', String(isCurrent));
    allTabsBtn.classList.toggle('active', !isCurrent);
    allTabsBtn.setAttribute('aria-selected', String(!isCurrent));
}

setCopyMode('current');

function handleKeyDown(event) {
    if (!templates.length) {
        if (event.key === 'Escape') {
            window.close();
        }
        return;
    }

    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCopyMode('current');
        return;
    }

    if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCopyMode('all');
        return;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        window.close();
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        selectTemplate(selectedIndex);
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(selectedIndex + 1);
        return;
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(selectedIndex - 1);
        return;
    }

    const numericKey = Number(event.key);
    if (Number.isInteger(numericKey) && numericKey >= 1 && numericKey <= 9) {
        const templateIndex = numericKey - 1;
        if (templateIndex < templates.length) {
            event.preventDefault();
            selectTemplate(templateIndex);
        }
    }
}

function showMessage(message) {
    paletteList.innerHTML = '';
    paletteMessage.textContent = message;
    paletteMessage.hidden = false;
}