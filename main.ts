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

interface TreeModalSettings {
  triggerModifier: TriggerModifier;
  enableFileMenu: boolean;
  defaultMode: ModalMode;
  hideCenter: boolean;
  hideChrome: boolean;
  ensureTerminalRight: boolean;
  terminalViewType: string;
}

const DEFAULT_SETTINGS: TreeModalSettings = {
  triggerModifier: "none",
  enableFileMenu: true,
  defaultMode: "edit",
  hideCenter: false,
  hideChrome: false,
  ensureTerminalRight: false,
  terminalViewType: "",
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

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!this.settings.enableFileMenu) return;
        if (!(file instanceof TFile)) return;
        menu.addItem((item) => {
          item
            .setTitle("In Modal öffnen")
            .setIcon("maximize-2")
            .onClick(() => this.openModalForFile(file));
        });
      })
    );

    this.addSettingTab(new TreeModalSettingTab(this.app, this));

    this.applyHideCenter(this.settings.hideCenter);
    this.applyHideChrome(this.settings.hideChrome);

    this.addCommand({
      id: "toggle-center-area",
      name: "Mittleren Bereich umschalten",
      callback: () => this.toggleHideCenter(),
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
    });
  }

  private handleExplorerClick(evt: MouseEvent) {
    const target = evt.target as HTMLElement | null;
    if (!target) return;

    const item = target.closest(".nav-file-title") as HTMLElement | null;
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
      console.warn(
        `[tree-modal] Konnte Terminal-View "${viewType}" nicht rechts anlegen:`,
        e
      );
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
        text: `Keine Vorschau für .${this.file.extension}. Cmd/Ctrl-Click öffnet die Datei normal.`,
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

    const anchor = target.closest(
      "a.internal-link, .cm-hmd-internal-link, .cm-link"
    ) as HTMLElement | null;
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

    new Setting(containerEl).setName("Modal").setHeading();

    new Setting(containerEl)
      .setName("Trigger-Modifier")
      .setDesc(
        'Welche Taste beim Click auf eine Datei im Baum gedrückt sein muss, damit das Modal öffnet. "Keine" überschreibt den normalen Click (Cmd/Ctrl-Click bleibt Escape).'
      )
      .addDropdown((dd) =>
        dd
          .addOption("none", "Keine (normaler Click)")
          .addOption("shift", "Shift+Click")
          .addOption("alt", "Alt/Option+Click")
          .setValue(this.plugin.settings.triggerModifier)
          .onChange(async (value) => {
            this.plugin.settings.triggerModifier = value as TriggerModifier;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Kontextmenü-Eintrag")
      .setDesc('Rechtsklick auf eine Datei zeigt "In Modal öffnen".')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableFileMenu)
          .onChange(async (value) => {
            this.plugin.settings.enableFileMenu = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Standard-Mode")
      .setDesc(
        "Mit welchem Mode das Modal initial öffnet. Innerhalb des Modals kannst du über den Obsidian-View-Header (Buch-/Stift-Icon) jederzeit umschalten."
      )
      .addDropdown((dd) =>
        dd
          .addOption("read", "Lesen")
          .addOption("edit", "Bearbeiten")
          .setValue(this.plugin.settings.defaultMode)
          .onChange(async (value) => {
            this.plugin.settings.defaultMode = value as ModalMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Layout").setHeading();

    new Setting(containerEl)
      .setName("Mittleren Bereich ausblenden")
      .setDesc(
        "Wenn aktiv, wird der mittlere Workspace-Bereich (Editor) ausgeblendet und der Platz an die Sidebars gegeben. Gleicher Effekt wie der Command 'Tree Modal: Mittleren Bereich umschalten'."
      )
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
      .setName("UI-Chrome ausblenden")
      .setDesc(
        "Versteckt die Sidebar-Toggle-Icons (links/rechts oben) und das Sync-Status-Icon unten rechts."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hideChrome)
          .onChange(async (value) => {
            this.plugin.settings.hideChrome = value;
            this.plugin.applyHideChrome(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Terminal beim Start rechts sicherstellen")
      .setDesc(
        "Nach Obsidian-Start prüfen, ob ein Terminal in der rechten Sidebar existiert, und ggf. eins anlegen. Funktioniert nur, wenn der View-Type unten gesetzt ist."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ensureTerminalRight)
          .onChange(async (value) => {
            this.plugin.settings.ensureTerminalRight = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Terminal-View-Type")
      .setDesc(
        "View-Type des Terminal-Plugins. Öffne zuerst manuell ein Terminal in der rechten Sidebar, dann auf 'Aktuelles Terminal merken' klicken. Alternativ manuell eintragen."
      )
      .addText((text) =>
        text
          .setPlaceholder("z.B. terminal:terminal-view")
          .setValue(this.plugin.settings.terminalViewType)
          .onChange(async (value) => {
            this.plugin.settings.terminalViewType = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Aktuelles Terminal merken")
          .setCta()
          .onClick(async () => {
            const type = this.plugin.captureRightTerminalViewType();
            if (!type) {
              new Notice(
                "Kein Terminal in der rechten Sidebar gefunden. Erst ein Terminal dort öffnen, dann erneut klicken."
              );
              return;
            }
            this.plugin.settings.terminalViewType = type;
            await this.plugin.saveSettings();
            new Notice(`Terminal-View-Type gespeichert: ${type}`);
            this.display();
          })
      );
  }
}
