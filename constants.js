const DEFAULT_TEMPLATES = [
    { id: 'markdown', name: 'Markdown', format: '[{{title}}]({{url}})' },
    { id: 'markdown2', name: 'Markdown 2', format: '{{title}} <{{url}}>' },
    { id: 'html', name: 'HTML', format: '<a href="{{url}}">{{title}}</a>' },
    { id: 'text', name: 'Text', format: '{{title}} {{url}}' },
    { id: 'text2', name: 'Two line text', format: '{{title}}\n{{url}}' }
];
