(function (root) {
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeMarkdownTitle(value) {
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/([`*_{}\[\]()#+\-.!|>])/g, '\\$1');
    }

    function escapeMarkdownUrl(value) {
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/[()<>]/g, '\\$&');
    }

    function escapeText(value) {
        return String(value);
    }

    function escapeFormatValue(value, format, field) {
        switch (format) {
            case 'markdown':
                return field === 'url' ? escapeMarkdownUrl(value) : escapeMarkdownTitle(value);
            case 'html':
                return escapeHtml(value);
            case 'text':
                return escapeText(value);
            default:
                return escapeText(value);
        }
    }

    function formatString(format, title, url) {
        return format.replace(/{{\s*(title|url)\s*(?::\s*([A-Za-z]+)\s*)?}}/g, (match, field, formatType) => {
            const value = field === 'title' ? title : url;

            if (!formatType) {
                return String(value);
            }

            const normalizedFormat = formatType.toLowerCase();
            if (normalizedFormat !== 'markdown' && normalizedFormat !== 'html' && normalizedFormat !== 'text') {
                return String(value);
            }

            return escapeFormatValue(value, normalizedFormat, field);
        });
    }

    const api = {
        escapeHtml,
        escapeMarkdownTitle,
        escapeMarkdownUrl,
        escapeText,
        escapeFormatValue,
        formatString
    };

    root.UrlCopierFormatter = api;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
