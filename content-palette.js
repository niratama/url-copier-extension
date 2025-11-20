(async function () {
    // Remove existing palette if present (to handle extension reloads or toggling)
    const existingHost = document.getElementById('url-copier-palette-host');
    if (existingHost) {
        existingHost.remove();
    }

    // Fetch templates from storage
    const { templates: storedTemplates } = await chrome.storage.sync.get(['templates']);
    // We need to access DEFAULT_TEMPLATES. Since we can't import in content script easily without modules,
    // we'll rely on storage or fallback. Ideally, background should pass this data, but reading storage is fine.
    // Note: DEFAULT_TEMPLATES is not available here unless we duplicate it or message background.
    // Let's try to get from storage, if empty, we might need to ask background.
    // Actually, for simplicity, let's ask background for the list to ensure consistency.

    // Wait, messaging background for data is better.
    const response = await chrome.runtime.sendMessage({ type: 'get-templates' });
    const templates = response.templates;

    if (!templates || templates.length === 0) {
        alert(chrome.i18n.getMessage('paletteNoTemplates'));
        return;
    }

    // Create Host
    const host = document.createElement('div');
    host.id = 'url-copier-palette-host';
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.zIndex = '2147483647'; // Max z-index
    host.style.display = 'flex';
    host.style.justifyContent = 'center';
    host.style.alignItems = 'flex-start';
    host.style.paddingTop = '100px';
    host.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    host.style.fontFamily = 'sans-serif';

    const shadow = host.attachShadow({ mode: 'open' });

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        .palette {
            background: white;
            width: 500px;
            max-width: 90%;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: slideDown 0.1s ease-out;
        }
        @keyframes slideDown {
            from { transform: translateY(-10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .header {
            padding: 10px 15px;
            background: #f5f5f5;
            border-bottom: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
        .list {
            max-height: 400px;
            overflow-y: auto;
            padding: 5px 0;
        }
        .item {
            padding: 10px 15px;
            cursor: pointer;
            display: flex;
            align-items: center;
            font-size: 14px;
            color: #333;
        }
        .item:hover, .item.selected {
            background-color: #e6f7ff;
        }
        .key {
            background: #eee;
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 11px;
            margin-right: 10px;
            color: #555;
            min-width: 15px;
            text-align: center;
        }
        .name {
            flex-grow: 1;
            font-weight: 500;
        }
        .format {
            color: #999;
            font-size: 12px;
            margin-left: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }
    `;
    shadow.appendChild(style);

    // UI Structure
    const palette = document.createElement('div');
    palette.className = 'palette';

    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = chrome.i18n.getMessage('paletteInstruction');
    palette.appendChild(header);

    const list = document.createElement('div');
    list.className = 'list';

    templates.forEach((tpl, index) => {
        const item = document.createElement('div');
        item.className = 'item';
        if (index === 0) item.classList.add('selected');

        const key = index < 9 ? String(index + 1) : '';

        const keySpan = document.createElement('span');
        keySpan.className = 'key';
        keySpan.textContent = key;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = tpl.name;

        const formatSpan = document.createElement('span');
        formatSpan.className = 'format';
        formatSpan.textContent = tpl.format;

        item.appendChild(keySpan);
        item.appendChild(nameSpan);
        item.appendChild(formatSpan);

        item.onclick = () => selectTemplate(tpl);
        item.onmouseenter = () => {
            shadow.querySelectorAll('.item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
        };

        list.appendChild(item);
    });

    palette.appendChild(list);
    shadow.appendChild(palette);
    document.body.appendChild(host);

    // Focus management
    let selectedIndex = 0;
    const items = list.querySelectorAll('.item');

    function close() {
        if (host.parentNode) {
            document.body.removeChild(host);
        }
        document.removeEventListener('keydown', handleKey);
    }

    function selectTemplate(template) {
        chrome.runtime.sendMessage({
            type: 'copy-template',
            templateId: template.id
        });
        close();
    }

    function handleKey(e) {
        e.stopPropagation();
        e.preventDefault();

        if (e.key === 'Escape') {
            close();
            return;
        }

        if (e.key === 'Enter') {
            selectTemplate(templates[selectedIndex]);
            return;
        }

        if (e.key === 'ArrowDown') {
            items[selectedIndex].classList.remove('selected');
            selectedIndex = (selectedIndex + 1) % items.length;
            items[selectedIndex].classList.add('selected');
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
            return;
        }

        if (e.key === 'ArrowUp') {
            items[selectedIndex].classList.remove('selected');
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            items[selectedIndex].classList.add('selected');
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
            return;
        }

        // Number keys 1-9
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= 9 && num <= templates.length) {
            selectTemplate(templates[num - 1]);
        }
    }

    document.addEventListener('keydown', handleKey, { capture: true });
    host.onclick = (e) => {
        if (e.target === host) close();
    };

})();
