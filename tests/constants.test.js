const test = require('node:test');
const assert = require('node:assert/strict');
const {
    DEFAULT_TEMPLATES,
    LEGACY_DEFAULT_TEMPLATE_FORMATS,
    migrateLegacyDefaultTemplates
} = require('../constants');

test('returns default templates when input is not an array', () => {
    const result = migrateLegacyDefaultTemplates(null);
    assert.equal(result, DEFAULT_TEMPLATES);
});

test('migrates only exact legacy default formats by template id', () => {
    const input = [
        { id: 'markdown', name: 'Markdown', format: LEGACY_DEFAULT_TEMPLATE_FORMATS.markdown },
        { id: 'html', name: 'HTML', format: LEGACY_DEFAULT_TEMPLATE_FORMATS.html },
        { id: 'text', name: 'Text', format: '{{title}} -- {{url}}' }
    ];

    const result = migrateLegacyDefaultTemplates(input);

    assert.equal(result[0].format, '[{{title:markdown}}]({{url:markdown}})');
    assert.equal(result[1].format, '<a href="{{url:html}}">{{title:html}}</a>');
    assert.equal(result[2].format, '{{title}} -- {{url}}');
});

test('keeps custom template ids untouched even with legacy-like formats', () => {
    const custom = { id: 'custom', name: 'My Template', format: '[{{title}}]({{url}})' };
    const result = migrateLegacyDefaultTemplates([custom]);
    assert.equal(result[0], custom);
});

test('preserves non-string format entries unchanged', () => {
    const input = [{ id: 'markdown', name: 'Markdown', format: null }];
    const result = migrateLegacyDefaultTemplates(input);
    assert.equal(result[0], input[0]);
});
