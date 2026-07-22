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
});

// Handle Icon Click (Action)
chrome.action.onClicked.addListener(async (tab) => {
    if (tab && !isRestrictedUrl(tab.url)) {
        await openPalette({ sourceTabId: tab.id, windowId: tab.windowId });
    }
});

function isRestrictedUrl(url = '') {
    return url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:');
}

async function openPalette({ sourceTabId, windowId }) {
    const paletteUrl = chrome.runtime.getURL(`palette.html?sourceTabId=${encodeURIComponent(sourceTabId)}&sourceWindowId=${encodeURIComponent(windowId)}`);
    const popupWidth = 360;
    const popupHeight = 280;
    const activeWindow = await chrome.windows.get(windowId);
    const left = Math.round((activeWindow.left || 0) + Math.max(0, ((activeWindow.width || popupWidth) - popupWidth) / 2));
    const top = Math.round((activeWindow.top || 0) + Math.max(0, ((activeWindow.height || popupHeight) - popupHeight) / 2));
    await chrome.windows.create({
        url: paletteUrl,
        type: 'popup',
        width: popupWidth,
        height: popupHeight,
        left,
        top,
        focused: true
    });
}

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

async function copyAllTabsInWindow(windowId, templateId) {
    const { templates } = await chrome.storage.sync.get('templates');
    const currentTemplates = templates || DEFAULT_TEMPLATES;

    const targetId = templateId || (currentTemplates[0] ? currentTemplates[0].id : 'markdown');
    const template = currentTemplates.find(t => t.id === targetId);

    if (!template) return;

    const tabs = await chrome.tabs.query({ windowId });
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
        const result = await chrome.storage.sync.get(['lastUsedTemplateId']);
        const lastUsedId = result.lastUsedTemplateId;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await copyTab(tab, lastUsedId);
        }
    } else if (command === 'show-palette') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && !isRestrictedUrl(tab.url)) {
            await openPalette({ sourceTabId: tab.id, windowId: tab.windowId });
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
        const tabPromise = message.sourceTabId
            ? chrome.tabs.get(message.sourceTabId).catch(() => null)
            : Promise.resolve(sender.tab || null);

        tabPromise.then(async (tab) => {
            if (!tab) {
                sendResponse({ success: false });
                return;
            }

            await copyTab(tab, message.templateId);
            await chrome.storage.sync.set({ lastUsedTemplateId: message.templateId });
            sendResponse({ success: true });
        });
        return true;
    } else if (message.type === 'copy-all-tabs') {
        const windowId = message.sourceWindowId;
        if (typeof windowId !== 'number') {
            sendResponse({ success: false });
            return true;
        }

        copyAllTabsInWindow(windowId, message.templateId).then(async () => {
            await chrome.storage.sync.set({ lastUsedTemplateId: message.templateId });
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    }
});
