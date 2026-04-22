# Tree Modal

Obsidian plugin that opens files from the file explorer in a modal preview instead of in the editor.

## Features

- **Click** a file in the tree → 80% viewport modal with Obsidian's native view header (read/edit toggle, full width)
- **Cmd/Ctrl-click** → opens the file normally in the editor (escape route)
- **Right-click → "Open in modal"** as a fallback (survives Obsidian DOM updates)
- **Internal links inside the modal** are captured and opened in-place in the same modal
- Configurable trigger modifier (none / Shift / Alt)
- Toggle to hide the center workspace area and give the space to the sidebars
- Toggle to hide sidebar toggles and sync status icon
- Optional: ensure a terminal view stays mounted in the right sidebar after startup

## Install

### Community plugin (once accepted)

Settings → Community plugins → Browse → search "Tree Modal" → Install → Enable.

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](../../releases/latest).
2. Copy them into `<vault>/.obsidian/plugins/tree-modal/`.
3. Reload Obsidian, then enable the plugin under *Settings → Community plugins*.

## Development

```bash
npm install
npm run dev     # watch mode
npm run build   # production build (minified)
```

For local testing, symlink the plugin folder into your vault:

```bash
ln -s "$(pwd)" <vault>/.obsidian/plugins/tree-modal
```

## How it works

The default click handler of the file explorer is intercepted via a DOM event listener
on `document` in capture phase, filtered to `.nav-file-title` elements. `preventDefault()`
and `stopPropagation()` block the default "open in editor" behavior; Cmd/Ctrl-click and
folder clicks pass through unchanged.

The modal embeds a detached `WorkspaceLeaf` in markdown mode, so everything Obsidian
provides (live preview, wikilink completion, Templater, the native read/edit toggle)
keeps working inside the modal.

As a supported second path, a `file-menu` entry "Open in modal" is registered via the
official API, independent of the DOM structure.

## Limitations

- `data-path` on `.nav-file-title` is not part of the official plugin API. It works
  reliably today but could theoretically break with an Obsidian update. The file-menu
  fallback keeps the core feature usable in that case.
- Non-markdown files show a hint instead of a preview; Cmd/Ctrl-click opens them normally.

## License

MIT
