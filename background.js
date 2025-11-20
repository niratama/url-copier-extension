importScripts('constants.js');

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
        title: chrome.i18n.getMessage('extName'),
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

    // Copy All Tabs (Parent)
    chrome.contextMenus.create({
        id: 'copy_all_parent',
        parentId: 'parent',
        title: chrome.i18n.getMessage('copyAllTabs'),
        contexts: ['all']
    });

    // Copy All Tabs Sub-items
    currentTemplates.forEach(template => {
        chrome.contextMenus.create({
            id: `copy_all_${template.id}`,
            parentId: 'copy_all_parent',
            title: template.name,
            contexts: ['all']
        });
    });
}

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId.startsWith('copy_all_')) {
        const templateId = info.menuItemId.replace('copy_all_', '');
        await copyAllTabs(templateId);
    } else if (info.menuItemId.startsWith('template_')) {
        const templateId = info.menuItemId.replace('template_', '');
        await copyTab(tab, templateId);
        await chrome.storage.sync.set({ lastUsedTemplateId: templateId });
    }
});

// Handle Icon Click (Action)
chrome.action.onClicked.addListener(async (tab) => {
    if (tab) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content-palette.js']
            });
        } catch (err) {
            console.error('Failed to inject palette:', err);
        }
    }
});

async function copyTab(tab, templateId) {
    const { templates } = await chrome.storage.sync.get('templates');
    const currentTemplates = templates || DEFAULT_TEMPLATES;
    const template = currentTemplates.find(t => t.id === templateId);

    if (template) {
        const text = formatString(template.format, tab.title, tab.url);
        await addToClipboard(text);
    } else {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: chrome.i18n.getMessage('extName'),
            message: chrome.i18n.getMessage('paletteNoTemplates') // Reusing "No templates found" or similar, or just generic error.
            // Actually, let's use a more specific message if possible, or fallback to a generic one.
            // Since we don't have a specific "Template not found" message key yet, let's use a generic one or add one.
            // For now, I'll use a hardcoded fallback or reuse 'copyErrorMsg' with context?
            // Let's stick to existing keys to avoid breaking i18n if I don't want to edit json files again.
            // 'paletteNoTemplates' is "No templates found.", which is close enough.
        });
    }
}

async function copyAllTabs(templateId) {
    const { templates } = await chrome.storage.sync.get('templates');
    const currentTemplates = templates || DEFAULT_TEMPLATES;

    // If no templateId passed (shouldn't happen with new menu), fallback to first
    const targetId = templateId || (currentTemplates[0] ? currentTemplates[0].id : 'markdown');
    const template = currentTemplates.find(t => t.id === targetId);

    if (!template) return;

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const text = tabs.map(tab => formatString(template.format, tab.title, tab.url)).join('\n');
    await addToClipboard(text);
}

function formatString(format, title, url) {
    const replacements = {
        '{{title}}': title,
        '{{url}}': url
    };
    return format.replace(/{{title}}|{{url}}/g, match => replacements[match]);
}

// Clipboard Helper using Offscreen Document
async function addToClipboard(text) {
    await setupOffscreenDocument('offscreen.html');

    // Send message to offscreen document
    const response = await chrome.runtime.sendMessage({
        type: 'copy-data',
        target: 'offscreen-doc',
        data: text
    });

    if (!response || !response.success) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: chrome.i18n.getMessage('extName'),
            message: chrome.i18n.getMessage('copyErrorMsg')
        });
    }
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy-last-used') {
        // Same logic as action click
        const result = await chrome.storage.sync.get(['lastUsedTemplateId', 'templates']);
        const templates = result.templates || DEFAULT_TEMPLATES;
        const lastUsedId = result.lastUsedTemplateId;
        const template = templates.find(t => t.id === lastUsedId) || templates[0];

        if (template) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await copyTab(tab, template.id);
            }
        }
    } else if (command === 'show-palette') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-palette.js']
                });
            } catch (err) {
                console.error('Failed to inject palette:', err);
            }
        }
    } else if (command === 'copy-slot-1' || command === 'copy-slot-2') {
        const slotKey = command === 'copy-slot-1' ? 'slot1TemplateId' : 'slot2TemplateId';
        const result = await chrome.storage.sync.get([slotKey, 'templates']);
        const templates = result.templates || DEFAULT_TEMPLATES;
        const templateId = result[slotKey];

        if (templateId) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await copyTab(tab, templateId);
            }
        }
    }
});

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

// Handle messages from content script (Palette)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'get-templates') {
        chrome.storage.sync.get('templates').then(({ templates }) => {
            sendResponse({ templates: templates || DEFAULT_TEMPLATES });
        });
        return true; // Keep channel open for async response
    } else if (message.type === 'copy-template') {
        // We need the tab from the sender
        const tab = sender.tab;
        if (tab) {
            copyTab(tab, message.templateId);
        }
    }
});
