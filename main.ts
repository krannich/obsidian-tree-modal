import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
} from "obsidian";

type TriggerModifier = "none" | "shift" | "alt";
type ModalMode = "read" | "edit";

const LOCALES = {
  en: {
    menuOpenInModal: "Open in modal",
    menuOpenPath: "Open path in Finder",
    cmdToggleCenter: "Toggle center area",
    cmdOpenCurrentPath: "Open current note's path in Finder",
    noticeNoActiveFile: "No active file.",
    noticeNoProperty: (prop: string) =>
      `No "${prop}" property in frontmatter.`,
    noticeRequireUnavailable: "Open path: window.require not available.",
    noticeShellUnavailable: "Open path: electron.shell not available.",
    noticeOpenFailed: (err: string) => `Could not open path: ${err}`,
    noticeOpenError: (err: string) => `Error opening path: ${err}`,
    noticeNoTerminalFound:
      "No terminal in the right sidebar. Open one there first, then click again.",
    noticeTerminalSaved: (type: string) => `Terminal view type saved: ${type}`,
    headingModal: "Modal",
    headingPath: "Open path in Finder",
    headingLayout: "Layout",
    settingTriggerName: "Trigger",
    settingTriggerDesc:
      'Which key must be held when clicking a file in the tree to open the modal. "None" overrides the normal click (Cmd/Ctrl-click is always a fallback).',
    triggerOptionNone: "None (normal click)",
    triggerOptionShift: "Shift+click",
    triggerOptionAlt: "Alt/Option+click",
    settingFileMenuName: "Context menu entry",
    settingFileMenuDesc:
      'Right-clicking a file shows "Open in modal".',
    settingDefaultModeName: "Default mode",
    settingDefaultModeDesc:
      "Which mode the modal opens in. You can always toggle inside the modal via Obsidian's native view header (book/pen icon).",
    modeOptionRead: "Read",
    modeOptionEdit: "Edit",
    settingOpenNewFileName: "Open new files in modal",
    settingOpenNewFileDesc:
      "When enabled, a newly created markdown file opens automatically in the modal.",
    settingPropertyKeyName: "Property key",
    settingPropertyKeyDesc:
      'Name of the frontmatter property whose value is opened as an external path via Shift+click or the context menu. Supports "~" as home directory.',
    settingShiftClickName: "Shift+click on property",
    settingShiftClickDesc:
      "Shift+click on the property value in the properties panel opens the path in Finder/Explorer.",
    settingFileMenuPathName: "Context menu on file",
    settingFileMenuPathDesc:
      'Right-clicking a file with the property set shows "Open path in Finder" in the menu.',
    settingHideCenterName: "Hide center area",
    settingHideCenterDesc:
      "When enabled, hides the center workspace area (editor) and gives the space to the sidebars. Same effect as the command 'Tree Modal: Toggle center area'.",
    settingHideChromeName: "Hide interface icons",
    settingHideChromeDesc:
      "Hides the sidebar toggle icons (top left/right) and the sync status icon at the bottom right.",
    warnNoTerminalPrefix: "No terminal plugin active. ",
    warnNoTerminalBody:
      "The settings below require an installed terminal plugin (e.g. ",
    warnNoTerminalLink: "Terminal",
    warnNoTerminalSuffix: "). Install and enable it to use them.",
    settingEnsureTerminalName: "Ensure terminal on startup",
    settingEnsureTerminalDesc:
      "On Obsidian start, check whether a terminal exists in the right sidebar and create one if missing. Requires the view type below to be set.",
    settingTerminalViewTypeName: "Terminal view type",
    settingTerminalViewTypeDesc:
      "View type of the terminal plugin. Open a terminal in the right sidebar manually, then click 'Remember current terminal'. You can also enter the type manually.",
    settingTerminalViewTypePlaceholder: "e.g. terminal:terminal-view",
    settingTerminalCaptureButton: "Remember current terminal",
    modalNoPreview: (ext: string) =>
      `No preview for .${ext}. Cmd/Ctrl-click opens the file normally.`,
    warnTerminalSetupFailed: "[tree-modal] Could not create terminal view",
  },
  de: {
    menuOpenInModal: "In Modal öffnen",
    menuOpenPath: "Pfad im Finder öffnen",
    cmdToggleCenter: "Mittleren Bereich umschalten",
    cmdOpenCurrentPath: "Pfad der aktuellen Notiz im Finder öffnen",
    noticeNoActiveFile: "Keine aktive Datei.",
    noticeNoProperty: (prop: string) =>
      `Keine Property "${prop}" in der Frontmatter.`,
    noticeRequireUnavailable: "Finder-Öffnen: window.require nicht verfügbar.",
    noticeShellUnavailable: "Finder-Öffnen: electron.shell nicht verfügbar.",
    noticeOpenFailed: (err: string) =>
      `Pfad konnte nicht geöffnet werden: ${err}`,
    noticeOpenError: (err: string) => `Fehler beim Öffnen: ${err}`,
    noticeNoTerminalFound:
      "Kein Terminal in der rechten Sidebar gefunden. Erst ein Terminal dort öffnen, dann erneut klicken.",
    noticeTerminalSaved: (type: string) =>
      `Terminal-Viewtyp gespeichert: ${type}`,
    headingModal: "Modal",
    headingPath: "Pfad im Finder öffnen",
    headingLayout: "Layout",
    settingTriggerName: "Auslöser",
    settingTriggerDesc:
      'Welche Taste beim Klick auf eine Datei im Baum gedrückt sein muss, damit das Modal öffnet. "Keine" überschreibt den normalen Klick (Cmd/Ctrl-Klick bleibt Escape).',
    triggerOptionNone: "Keine (normaler Klick)",
    triggerOptionShift: "Shift+Klick",
    triggerOptionAlt: "Alt/Option+Klick",
    settingFileMenuName: "Kontextmenü-Eintrag",
    settingFileMenuDesc:
      'Rechtsklick auf eine Datei zeigt "In Modal öffnen".',
    settingDefaultModeName: "Standardmodus",
    settingDefaultModeDesc:
      "Mit welchem Modus das Modal initial öffnet. Innerhalb des Modals kannst du über den Obsidian-View-Header (Buch-/Stift-Icon) jederzeit umschalten.",
    modeOptionRead: "Lesen",
    modeOptionEdit: "Bearbeiten",
    settingOpenNewFileName: "Neue Dateien im Modal öffnen",
    settingOpenNewFileDesc:
      "Wenn aktiv, öffnet eine frisch angelegte Markdown-Datei automatisch im Modal.",
    settingPropertyKeyName: "Property-Schlüssel",
    settingPropertyKeyDesc:
      'Name der Frontmatter-Property, deren Wert per Shift+Klick oder Kontextmenü als externer Pfad im Finder/Explorer geöffnet wird. Unterstützt "~" als Heimverzeichnis.',
    settingShiftClickName: "Shift+Klick auf Property",
    settingShiftClickDesc:
      "Shift+Klick auf den Wert der Property im Eigenschaften-Panel öffnet den Pfad im Finder/Explorer.",
    settingFileMenuPathName: "Kontextmenü auf Datei",
    settingFileMenuPathDesc:
      'Rechtsklick auf eine Datei mit gesetzter Property zeigt "Pfad im Finder öffnen" als Menü-Eintrag.',
    settingHideCenterName: "Mittleren Bereich ausblenden",
    settingHideCenterDesc:
      "Wenn aktiv, wird der mittlere Workspace-Bereich (Editor) ausgeblendet und der Platz an die Sidebars gegeben. Gleicher Effekt wie der Command 'Tree Modal: Mittleren Bereich umschalten'.",
    settingHideChromeName: "Oberflächen-Icons ausblenden",
    settingHideChromeDesc:
      "Versteckt die Sidebar-Toggle-Icons (links/rechts oben) und das Sync-Status-Icon unten rechts.",
    warnNoTerminalPrefix: "Kein Terminal-Plugin aktiv. ",
    warnNoTerminalBody:
      "Die folgenden Einstellungen benötigen ein installiertes Terminal-Plugin (z. B. ",
    warnNoTerminalLink: "Terminal",
    warnNoTerminalSuffix:
      "). Installiere und aktiviere es, um sie zu nutzen.",
    settingEnsureTerminalName: "Terminal beim Start rechts sicherstellen",
    settingEnsureTerminalDesc:
      "Nach Obsidian-Start prüfen, ob ein Terminal in der rechten Sidebar existiert, und ggf. eins anlegen. Funktioniert nur, wenn der View-Type unten gesetzt ist.",
    settingTerminalViewTypeName: "Terminal-Viewtyp",
    settingTerminalViewTypeDesc:
      "View-Type des Terminal-Plugins. Öffne zuerst manuell ein Terminal in der rechten Sidebar, dann auf 'Aktuelles Terminal merken' klicken. Alternativ manuell eintragen.",
    settingTerminalViewTypePlaceholder: "z.B. terminal:terminal-view",
    settingTerminalCaptureButton: "Aktuelles Terminal merken",
    modalNoPreview: (ext: string) =>
      `Keine Vorschau für .${ext}. Cmd/Ctrl-Klick öffnet die Datei normal.`,
    warnTerminalSetupFailed:
      "[tree-modal] Konnte Terminal-View nicht rechts anlegen",
  },
} as const;

type LocaleStrings = typeof LOCALES.en;
type LocaleKey = keyof LocaleStrings;

function t<K extends LocaleKey>(key: K): LocaleStrings[K] {
  const lang = window.localStorage.getItem("language") || "en";
  const locales = LOCALES as unknown as Record<string, LocaleStrings>;
  const locale = locales[lang] ?? LOCALES.en;
  return locale[key] as LocaleStrings[K];
}

interface TreeModalSettings {
  triggerModifier: TriggerModifier;
  enableFileMenu: boolean;
  defaultMode: ModalMode;
  hideCenter: boolean;
  hideChrome: boolean;
  ensureTerminalRight: boolean;
  terminalViewType: string;
  openPathProperty: string;
  enableOpenPathShiftClick: boolean;
  enableOpenPathFileMenu: boolean;
  openNewFileInModal: boolean;
}

const DEFAULT_SETTINGS: TreeModalSettings = {
  triggerModifier: "none",
  enableFileMenu: true,
  defaultMode: "edit",
  hideCenter: false,
  hideChrome: false,
  ensureTerminalRight: false,
  terminalViewType: "",
  openPathProperty: "path",
  enableOpenPathShiftClick: true,
  enableOpenPathFileMenu: true,
  openNewFileInModal: false,
};

export default class TreeModalPlugin extends Plugin {
  settings: TreeModalSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerDomEvent(
      document,
      "click",
      this.handleExplorerClick.bind(this),
      { capture: true }
    );

    this.registerDomEvent(
      document,
      "mousedown",
      this.handleMousedown.bind(this),
      { capture: true }
    );

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile)) return;
        if (this.settings.enableFileMenu) {
          menu.addItem((item) => {
            item
              .setTitle(t("menuOpenInModal"))
              .setIcon("maximize-2")
              .onClick(() => this.openModalForFile(file));
          });
        }
        if (this.settings.enableOpenPathFileMenu) {
          const raw = this.readPathProperty(file);
          if (raw) {
            menu.addItem((item) => {
              item
                .setTitle(t("menuOpenPath"))
                .setIcon("folder-open")
                .onClick(() => this.openPath(raw));
            });
          }
        }
      })
    );

    this.addSettingTab(new TreeModalSettingTab(this.app, this));

    this.applyHideCenter(this.settings.hideCenter);
    this.applyHideChrome(this.settings.hideChrome);

    this.addCommand({
      id: "toggle-center-area",
      name: t("cmdToggleCenter"),
      callback: () => this.toggleHideCenter(),
    });

    this.addCommand({
      id: "open-path-in-finder",
      name: t("cmdOpenCurrentPath"),
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice(t("noticeNoActiveFile"));
          return;
        }
        const raw = this.readPathProperty(file);
        if (!raw) {
          new Notice(t("noticeNoProperty")(this.settings.openPathProperty));
          return;
        }
        this.openPath(raw);
      },
    });

    this.register(() => {
      document.body.removeClass("tree-modal-hide-center");
      document.body.removeClass("tree-modal-hide-chrome");
    });

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.ensureTerminalRight && this.settings.terminalViewType) {
        // Delay, damit asynchron registrierende Plugins (Terminal) ihre
        // View-Types sicher eingetragen haben
        window.setTimeout(() => void this.ensureTerminalInRightSidebar(), 600);
      }

      // Nach onLayoutReady registrieren, damit Initial-Indexing-Events
      // (die für alle bestehenden Dateien feuern) nicht ausgelöst werden.
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (!this.settings.openNewFileInModal) return;
          if (!(file instanceof TFile)) return;
          if (file.extension !== "md") return;
          this.openModalForFile(file);
        })
      );
    });
  }

  private handleMousedown(evt: MouseEvent) {
    if (!evt.shiftKey) return;
    const target = evt.target as HTMLElement | null;
    if (!target) return;
    // Nur im Property-Panel greifen — Baum wird in click behandelt
    if (!target.closest("[data-property-key], .metadata-property, .metadata-container")) return;
    this.handlePropertyShiftClick(evt, target);
  }

  private handleExplorerClick(evt: MouseEvent) {
    const target = evt.target as HTMLElement | null;
    if (!target) return;

    if (this.handlePropertyShiftClick(evt, target)) return;

    const item = target.closest<HTMLElement>(".nav-file-title");
    if (!item) return;

    if (evt.metaKey || evt.ctrlKey) return;
    if (!this.matchesTriggerModifier(evt)) return;

    const path = item.getAttribute("data-path");
    if (!path) return;

    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;

    evt.preventDefault();
    evt.stopPropagation();
    this.openModalForFile(file);
  }

  private handlePropertyShiftClick(evt: MouseEvent, target: HTMLElement): boolean {
    if (!this.settings.enableOpenPathShiftClick) return false;
    if (!evt.shiftKey) return false;

    const prop =
      target.closest<HTMLElement>("[data-property-key]") ||
      target.closest<HTMLElement>(".metadata-property");

    if (!prop) return false;

    const key = this.readPropertyKey(prop);
    if (!key || key !== this.settings.openPathProperty) return false;

    const raw = this.readPropertyValueFromDom(prop);
    if (!raw) return false;

    evt.preventDefault();
    evt.stopPropagation();
    this.openPath(raw);
    return true;
  }

  private readPropertyKey(prop: HTMLElement): string {
    const attr = prop.getAttribute("data-property-key");
    if (attr) return attr.trim();

    const keyInput = prop.querySelector<HTMLInputElement>(
      ".metadata-property-key-input"
    );
    if (keyInput?.value) return keyInput.value.trim();

    const keyEl = prop.querySelector<HTMLElement>(".metadata-property-key");
    if (keyEl) {
      const inner =
        keyEl.querySelector("input")?.value ||
        keyEl.textContent ||
        "";
      if (inner) return inner.trim();
    }
    return "";
  }

  private readPropertyValueFromDom(prop: HTMLElement): string {
    const valueWrapper = prop.querySelector<HTMLElement>(
      ".metadata-property-value"
    );
    const scope = valueWrapper ?? prop;

    const editable = scope.querySelector<HTMLElement>(
      ".metadata-input-longtext, [contenteditable='true']"
    );
    if (editable && editable.textContent) return editable.textContent.trim();

    const input = scope.querySelector<HTMLInputElement>(
      "input.metadata-input-text, input[type='text'], input"
    );
    if (input && input.value) return input.value.trim();

    return scope.textContent?.trim() || "";
  }

  private readPathProperty(file: TFile): string | null {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const raw = fm?.[this.settings.openPathProperty];
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private openPath(raw: string) {
    const home = process.env.HOME || "";
    let abs = raw.trim();
    if (abs.startsWith("~/")) abs = home + abs.slice(1);
    else if (abs === "~") abs = home;

    try {
      const req = (window as unknown as {
        require?: (m: string) => unknown;
      }).require;
      if (!req) {
        new Notice(t("noticeRequireUnavailable"));
        return;
      }
      const electron = req("electron") as {
        shell?: { openPath: (p: string) => Promise<string> };
      };
      const shell = electron?.shell;
      if (!shell) {
        new Notice(t("noticeShellUnavailable"));
        return;
      }
      shell
        .openPath(abs)
        .then((err) => {
          if (err) new Notice(t("noticeOpenFailed")(err));
        })
        .catch((e) => {
          new Notice(t("noticeOpenError")(String(e)));
        });
    } catch (e) {
      new Notice(t("noticeOpenError")(String(e)));
    }
  }

  private matchesTriggerModifier(evt: MouseEvent): boolean {
    switch (this.settings.triggerModifier) {
      case "none":
        return !evt.shiftKey && !evt.altKey;
      case "shift":
        return evt.shiftKey && !evt.altKey;
      case "alt":
        return evt.altKey && !evt.shiftKey;
    }
  }

  openModalForFile(file: TFile) {
    new PreviewModal(this.app, file, this).open();
  }

  applyHideCenter(hide: boolean) {
    document.body.toggleClass("tree-modal-hide-center", hide);
  }

  async toggleHideCenter() {
    this.settings.hideCenter = !this.settings.hideCenter;
    this.applyHideCenter(this.settings.hideCenter);
    await this.saveSettings();
  }

  applyHideChrome(hide: boolean) {
    document.body.toggleClass("tree-modal-hide-chrome", hide);
  }

  getRightSidebarLeaves(): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];
    const rightRoot = this.app.workspace.rightSplit;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.getRoot() === rightRoot) leaves.push(leaf);
    });
    return leaves;
  }

  isTerminalPluginEnabled(): boolean {
    const enabled = (this.app as unknown as {
      plugins?: { enabledPlugins?: Set<string> };
    }).plugins?.enabledPlugins;
    if (!enabled) return false;
    for (const id of enabled) {
      if (id.toLowerCase().includes("terminal")) return true;
    }
    return false;
  }

  captureRightTerminalViewType(): string | null {
    const rightLeaves = this.getRightSidebarLeaves();
    const match = rightLeaves.find((leaf) => {
      const type = leaf.view?.getViewType?.() ?? "";
      return type.toLowerCase().includes("terminal");
    });
    if (!match) return null;
    return match.view.getViewType();
  }

  async ensureTerminalInRightSidebar() {
    const viewType = this.settings.terminalViewType;
    if (!viewType) return;

    const existing = this.app.workspace.getLeavesOfType(viewType);
    const rightRoot = this.app.workspace.rightSplit;
    const inRight = existing.some((leaf) => leaf.getRoot() === rightRoot);
    if (inRight) return;

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;

    try {
      await leaf.setViewState({ type: viewType, active: false });
    } catch (e) {
      console.warn(`${t("warnTerminalSetupFailed")} "${viewType}":`, e);
    }
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class PreviewModal extends Modal {
  private file: TFile;
  private plugin: TreeModalPlugin;
  private leaf: WorkspaceLeaf | null = null;

  constructor(app: App, file: TFile, plugin: TreeModalPlugin) {
    super(app);
    this.file = file;
    this.plugin = plugin;
  }

  async onOpen() {
    this.modalEl.addClass("tree-modal");
    this.contentEl.addClass("tree-modal-content");

    if (this.file.extension !== "md") {
      this.contentEl.createDiv({
        cls: "tree-modal-empty",
        text: t("modalNoPreview")(this.file.extension),
      });
      return;
    }

    const LeafCtor = WorkspaceLeaf as unknown as new (app: App) => WorkspaceLeaf;
    this.leaf = new LeafCtor(this.app);

    const defaultMode = this.plugin.settings.defaultMode;
    await this.leaf.setViewState({
      type: "markdown",
      state: {
        file: this.file.path,
        mode: defaultMode === "read" ? "preview" : "source",
        source: false,
      },
      active: false,
    });

    const leafContainer = (this.leaf as unknown as {
      containerEl: HTMLElement;
    }).containerEl;
    if (leafContainer) {
      leafContainer.addClass("tree-modal-embedded-leaf");
      this.contentEl.appendChild(leafContainer);
    }

    this.contentEl.addEventListener(
      "click",
      this.handleInternalLinkClick,
      { capture: true }
    );
  }

  onClose() {
    this.contentEl.removeEventListener(
      "click",
      this.handleInternalLinkClick,
      { capture: true } as EventListenerOptions
    );
    if (this.leaf) {
      try {
        this.leaf.detach();
      } catch {
        // noop
      }
      this.leaf = null;
    }
    this.contentEl.empty();
  }

  private handleInternalLinkClick = (evt: MouseEvent) => {
    if (evt.defaultPrevented) return;
    if (evt.button !== 0) return;
    if (evt.metaKey || evt.ctrlKey) return;

    const target = evt.target as HTMLElement | null;
    if (!target) return;

    const anchor = target.closest<HTMLElement>(
      "a.internal-link, .cm-hmd-internal-link, .cm-link"
    );
    if (!anchor) return;

    const linktext =
      anchor.getAttribute("data-href") ||
      anchor.getAttribute("href") ||
      anchor.textContent ||
      "";
    if (!linktext) return;
    if (/^[a-z]+:\/\//i.test(linktext)) return;

    const sourcePath = this.file.path;
    const dest = this.app.metadataCache.getFirstLinkpathDest(
      linktext.replace(/#.*$/, "").replace(/\|.*$/, ""),
      sourcePath
    );
    if (!(dest instanceof TFile)) return;
    if (dest.extension !== "md") return;

    evt.preventDefault();
    evt.stopPropagation();
    void this.navigateTo(dest);
  };

  private async navigateTo(file: TFile) {
    if (!this.leaf) return;
    this.file = file;

    const defaultMode = this.plugin.settings.defaultMode;
    await this.leaf.setViewState({
      type: "markdown",
      state: {
        file: file.path,
        mode: defaultMode === "read" ? "preview" : "source",
        source: false,
      },
      active: false,
    });
  }
}

class TreeModalSettingTab extends PluginSettingTab {
  plugin: TreeModalPlugin;

  constructor(app: App, plugin: TreeModalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t("headingModal")).setHeading();

    new Setting(containerEl)
      .setName(t("settingTriggerName"))
      .setDesc(t("settingTriggerDesc"))
      .addDropdown((dd) =>
        dd
          .addOption("none", t("triggerOptionNone"))
          .addOption("shift", t("triggerOptionShift"))
          .addOption("alt", t("triggerOptionAlt"))
          .setValue(this.plugin.settings.triggerModifier)
          .onChange(async (value) => {
            this.plugin.settings.triggerModifier = value as TriggerModifier;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingFileMenuName"))
      .setDesc(t("settingFileMenuDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableFileMenu)
          .onChange(async (value) => {
            this.plugin.settings.enableFileMenu = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingDefaultModeName"))
      .setDesc(t("settingDefaultModeDesc"))
      .addDropdown((dd) =>
        dd
          .addOption("read", t("modeOptionRead"))
          .addOption("edit", t("modeOptionEdit"))
          .setValue(this.plugin.settings.defaultMode)
          .onChange(async (value) => {
            this.plugin.settings.defaultMode = value as ModalMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingOpenNewFileName"))
      .setDesc(t("settingOpenNewFileDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openNewFileInModal)
          .onChange(async (value) => {
            this.plugin.settings.openNewFileInModal = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName(t("headingPath")).setHeading();

    new Setting(containerEl)
      .setName(t("settingPropertyKeyName"))
      .setDesc(t("settingPropertyKeyDesc"))
      .addText((text) =>
        text
          .setPlaceholder("path")
          .setValue(this.plugin.settings.openPathProperty)
          .onChange(async (value) => {
            this.plugin.settings.openPathProperty = value.trim() || "path";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingShiftClickName"))
      .setDesc(t("settingShiftClickDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableOpenPathShiftClick)
          .onChange(async (value) => {
            this.plugin.settings.enableOpenPathShiftClick = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingFileMenuPathName"))
      .setDesc(t("settingFileMenuPathDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableOpenPathFileMenu)
          .onChange(async (value) => {
            this.plugin.settings.enableOpenPathFileMenu = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName(t("headingLayout")).setHeading();

    new Setting(containerEl)
      .setName(t("settingHideCenterName"))
      .setDesc(t("settingHideCenterDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hideCenter)
          .onChange(async (value) => {
            this.plugin.settings.hideCenter = value;
            this.plugin.applyHideCenter(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingHideChromeName"))
      .setDesc(t("settingHideChromeDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hideChrome)
          .onChange(async (value) => {
            this.plugin.settings.hideChrome = value;
            this.plugin.applyHideChrome(value);
            await this.plugin.saveSettings();
          })
      );

    const hasTerminal = this.plugin.isTerminalPluginEnabled();

    if (!hasTerminal) {
      const warn = containerEl.createDiv({ cls: "tree-modal-warn" });
      warn.createEl("strong", { text: t("warnNoTerminalPrefix") });
      warn.appendText(t("warnNoTerminalBody"));
      warn.createEl("a", {
        text: t("warnNoTerminalLink"),
        href: "obsidian://show-plugin?id=terminal",
      });
      warn.appendText(t("warnNoTerminalSuffix"));
    }

    new Setting(containerEl)
      .setName(t("settingEnsureTerminalName"))
      .setDesc(t("settingEnsureTerminalDesc"))
      .setDisabled(!hasTerminal)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ensureTerminalRight)
          .setDisabled(!hasTerminal)
          .onChange(async (value) => {
            this.plugin.settings.ensureTerminalRight = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settingTerminalViewTypeName"))
      .setDesc(t("settingTerminalViewTypeDesc"))
      .setDisabled(!hasTerminal)
      .addText((text) =>
        text
          .setPlaceholder(t("settingTerminalViewTypePlaceholder"))
          .setValue(this.plugin.settings.terminalViewType)
          .setDisabled(!hasTerminal)
          .onChange(async (value) => {
            this.plugin.settings.terminalViewType = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((btn) => {
        btn
          .setButtonText(t("settingTerminalCaptureButton"))
          .setCta()
          .setDisabled(!hasTerminal)
          .onClick(async () => {
            const type = this.plugin.captureRightTerminalViewType();
            if (!type) {
              new Notice(t("noticeNoTerminalFound"));
              return;
            }
            this.plugin.settings.terminalViewType = type;
            await this.plugin.saveSettings();
            new Notice(t("noticeTerminalSaved")(type));
            this.display();
          });
      });
  }
}
