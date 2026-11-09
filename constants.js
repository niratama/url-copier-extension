const DEFAULT_TEMPLATES = [
    { id: 'markdown', name: 'Markdown', format: '[{{title:markdown}}]({{url:markdown}})' },
    { id: 'markdown2', name: 'Markdown 2', format: '{{title:markdown}} <{{url:markdown}}>' },
    { id: 'html', name: 'HTML', format: '<a href="{{url:html}}">{{title:html}}</a>' },
    { id: 'text', name: 'Text', format: '{{title:text}} {{url:text}}' },
    { id: 'text2', name: 'Two line text', format: '{{title:text}}\n{{url:text}}' }
];

const LEGACY_DEFAULT_TEMPLATE_FORMATS = {
    markdown: '[{{title}}]({{url}})',
    markdown2: '{{title}} <{{url}}>',
    html: '<a href="{{url}}">{{title}}</a>',
    text: '{{title}} {{url}}',
    text2: '{{title}}\n{{url}}'
};

function migrateLegacyDefaultTemplates(templates) {
    if (!Array.isArray(templates)) {
        return DEFAULT_TEMPLATES;
    }

    return templates.map((template) => {
        if (!template || typeof template.format !== 'string') {
            return template;
        }

        const legacyFormat = LEGACY_DEFAULT_TEMPLATE_FORMATS[template.id];
        if (!legacyFormat || template.format !== legacyFormat) {
            return template;
        }

        const migratedTemplate = DEFAULT_TEMPLATES.find(defaultTemplate => defaultTemplate.id === template.id);
        return migratedTemplate ? { ...template, format: migratedTemplate.format } : template;
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_TEMPLATES,
        LEGACY_DEFAULT_TEMPLATE_FORMATS,
        migrateLegacyDefaultTemplates
    };
}
