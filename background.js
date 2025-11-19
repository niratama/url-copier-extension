const DEFAULT_TEMPLATES = [
    { id: 'markdown', name: 'Markdown', format: '[{{title}}]({{url}})' },
    { id: 'markdown2', name: 'Markdown 2', format: '{{title}} <{{url}}>' },
    { id: 'html', name: 'HTML', format: '<a href="{{url}}">{{title}}</a>' },
    { id: 'text', name: 'Text', format: '{{title}}\n{{url}}' }
];

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
    // Initialize storage with defaults if empty
    const { templates } = await chrome.storage.sync.get('templates');
    if (!templates) {
        await chrome.storage.sync.set({ templates: DEFAULT_TEMPLATES });
    }

    // Initialize last used template
    const { lastUsedTemplateId } = await chrome.storage.sync.get('lastUsedTemplateId');
    if (!lastUsedTemplateId) {
        await chrome.storage.sync.set({ lastUsedTemplateId: 'markdown' });
    }

    createContextMenus();
});

// Re-create context menus when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.templates) {
        createContextMenus();
    }
});

async function createContextMenus() {
    chrome.contextMenus.removeAll();

    const { templates } = await chrome.storage.sync.get('templates');
    const currentTemplates = templates || DEFAULT_TEMPLATES;

    // Parent menu
    chrome.contextMenus.create({
        id: 'parent',
        title: 'URL Copier',
        contexts: ['all']
    });

    // Template items
    currentTemplates.forEach(template => {
        chrome.contextMenus.create({
            id: `template_${template.id}`,
            parentId: 'parent',
            title: template.name,
            contexts: ['all']
        });
    });

    chrome.contextMenus.create({
        id: 'separator',
        parentId: 'parent',
        type: 'separator',
        contexts: ['all']
    });

    // Copy All Tabs
    chrome.contextMenus.create({
        id: 'copy_all',
        parentId: 'parent',
        title: 'Copy All Tabs',
        contexts: ['all']
    });
}

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'copy_all') {
        await copyAllTabs();
    } else if (info.menuItemId.startsWith('template_')) {
        const templateId = info.menuItemId.replace('template_', '');
        await copyTab(tab, templateId);
        await chrome.storage.sync.set({ lastUsedTemplateId: templateId });
    }
});

// Handle Icon Click (Action)
chrome.action.onClicked.addListener(async (tab) => {
    const { lastUsedTemplateId } = await chrome.storage.sync.get('lastUsedTemplateId');
    const templateId = lastUsedTemplateId || 'markdown';
    await copyTab(tab, templateId);
});

async function copyTab(tab, templateId) {
    const { templates } = await chrome.storage.sync.get('templates');
    const currentTemplates = templates || DEFAULT_TEMPLATES;
    const template = currentTemplates.find(t => t.id === templateId);

    if (template) {
        const text = formatString(template.format, tab.title, tab.url);
        await addToClipboard(text);
    }
}

async function copyAllTabs() {
    const { lastUsedTemplateId } = await chrome.storage.sync.get('lastUsedTemplateId');
    const { templates } = await chrome.storage.sync.get('templates');
    const currentTemplates = templates || DEFAULT_TEMPLATES;

    // Use last used template for "Copy All", or default to first one
    const templateId = lastUsedTemplateId || (currentTemplates[0] ? currentTemplates[0].id : 'markdown');
    const template = currentTemplates.find(t => t.id === templateId);

    if (!template) return;

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const text = tabs.map(tab => formatString(template.format, tab.title, tab.url)).join('\n');
    await addToClipboard(text);
}

function formatString(format, title, url) {
    return format.replace(/{{title}}/g, title).replace(/{{url}}/g, url);
}

// Clipboard Helper using Offscreen Document
async function addToClipboard(text) {
    await setupOffscreenDocument('offscreen.html');

    // Send message to offscreen document
    chrome.runtime.sendMessage({
        type: 'copy-data',
        target: 'offscreen-doc',
        data: text
    });
}

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path) {
    // Check if offscreen document exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // Create offscreen document
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['CLIPBOARD'],
            justification: 'To copy text to clipboard',
        });
        await creating;
        creating = null;
    }
}
