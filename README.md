# URL Copier Extension

A Chrome extension that allows you to copy the URL and Title of the current tab (or all tabs) in various customizable formats.

[日本語のREADMEはこちら](README_ja.md)

## Features

- **Customizable Templates**: Define your own formats using `{{title}}` and `{{url}}` placeholders.
- **Context Menu Integration**: Right-click on any page to select a specific format.
- **Command Palette Access**: Click the extension icon to open the Command Palette.
- **Copy All Tabs**: Option to copy the URL and Title of all open tabs in the current window.
- **Internationalization**: Supports English and Japanese.
- **Keyboard Shortcuts**:
  - `Alt+C`: Copy using the last used template.
  - `Alt+P`: Open the Command Palette to select a template.
  - `Alt+1`: Copy using the template assigned to Slot 1.
  - `Alt+2`: Copy using the template assigned to Slot 2.

## Default Templates

- **Markdown**: `[{{title}}]({{url}})`
- **Markdown 2**: `{{title}} <{{url}}>`
- **HTML**: `<a href="{{url}}">{{title}}</a>`
- **Text**: `{{title}} {{url}}`
- **Two line text**:
  ```
  {{title}}
  {{url}}
  ```

## Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the directory containing this extension.

## Usage

1.  **Right-click** on any page to see the "URL Copier" menu.
2.  Select a template to copy the current page's info.
3.  Select **Copy All Tabs** to copy info for all tabs in the window.
4.  **Left-click** the extension icon in the toolbar to open the Command Palette.
5.  Go to the **Options** page (Right-click icon -> Options) to add, edit, or delete templates.
6.  **Keyboard Shortcuts**: Use `Alt+P` to open the Command Palette for quick access to all templates. You can also configure `Alt+1` and `Alt+2` in the Options page for your favorite templates.

## License

MIT
