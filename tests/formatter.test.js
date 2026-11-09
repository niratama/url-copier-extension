const test = require('node:test');
const assert = require('node:assert/strict');
const { formatString } = require('../formatter');

test('legacy placeholders stay raw for compatibility', () => {
    const out = formatString('[{{title}}]({{url}})', 'A [B]', 'https://example.com/a_(b)');
    assert.equal(out, '[A [B]](https://example.com/a_(b))');
});

test('markdown template escapes title and URL with field-specific rules', () => {
    const out = formatString(
        '[{{title:markdown}}]({{url:markdown}})',
        'A [B] #1',
        'https://example.com/a_(b).html?x=1-2.3'
    );
    assert.equal(out, '[A \\[B\\] \\#1](https://example.com/a_\\(b\\).html?x=1-2.3)');
});

test('html template escapes title and href attribute values', () => {
    const out = formatString(
        '<a href="{{url:html}}">{{title:html}}</a>',
        'A & B <C> "Q"',
        "https://example.com/?a=1&b=2'x'"
    );
    assert.equal(
        out,
        '<a href="https://example.com/?a=1&amp;b=2&#39;x&#39;">A &amp; B &lt;C&gt; &quot;Q&quot;</a>'
    );
});

test('unknown format falls back to raw value', () => {
    const out = formatString('{{title:unknown}}|{{url:unknown}}', 'A [B]', 'https://e.x/(a)');
    assert.equal(out, 'A [B]|https://e.x/(a)');
});
