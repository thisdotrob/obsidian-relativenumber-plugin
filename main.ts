import { Plugin } from "obsidian";
import { gutter, GutterMarker } from "@codemirror/gutter";

const gutterMarker = (str) => new class extends GutterMarker {
  toDOM() { return document.createTextNode(str) }
}

const relativeLineNumbersExtension = () => gutter({
  lineMarker(view, line) {
    const lineNo = view.state.doc.lineAt(line.from).number
    if (lineNo > view.state.doc.lines) {
      return gutterMarker("0");
    }
    const cursorLine = view.state.doc.lineAt(view.state.selection.asSingle().ranges[0].to).number;
    if (lineNo === cursorLine) {
      return gutterMarker("0");
    } else {
      return gutterMarker(Math.abs(cursorLine - lineNo).toString());
    }
  },
  lineMarkerChange(update) {
    if (update.selectionSet) {
      const startLineNo = update.startState.doc.lineAt(update.startState.selection.asSingle().ranges[0].to).number
      const lineNo = update.state.doc.lineAt(update.state.selection.asSingle().ranges[0].to).number
      return lineNo !== startLineNo;
    }
  }
})

export default class RelativeLineNumbers extends Plugin {
  onload() {
    if (this.isLegacyEditorEnabled()) {
      this.registerLegacyExtension()
    } else {
      this.registerEditorExtension(relativeLineNumbersExtension())
    }
  }

  registerLegacyExtension() {
    if (this.isShowLineNumberEnabled()) {
      this.enableLegacyExtension()
    }

    const configChangedEvent = this.app.vault.on('config-changed', () => {
      const showLineNumber: Boolean = this.app.vault.getConfig("showLineNumber");
      if (showLineNumber && !this.legacyEnabled) {
        this.enableLegacyExtension()
      } else if (!showLineNumber && this.legacyEnabled) {
        this.disableLegacyExtension()
      }
    });

    configChangedEvent.ctx = this;

    this.registerEvent(configChangedEvent)
  }

  enableLegacyExtension() {
    this.legacyEnabled = true;
    this.registerCodeMirror((cm) => {
      cm.on("cursorActivity", this.legacyHandler);
    });
  }

  disableLegacyExtension() {
    this.legacyEnabled = false;
    this.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("cursorActivity", this.legacyHandler);
      cm.setOption("lineNumberFormatter", CodeMirror.defaults["lineNumberFormatter"]);
    });
  }

  legacyHandler(cm) {
    const current = cm.getCursor().line + 1;
    if (cm.state.curLineNum === current) {
      return;
    }
    cm.state.curLineNum = current;
    cm.setOption("lineNumberFormatter", (line: number) => {
      if (line === current) {
        return String(current);
      }

      return String(Math.abs(current - line));
    });
  }

  isLegacyEditorEnabled() {
    return this.app.vault.getConfig("legacyEditor")
  }

  isShowLineNumberEnabled() {
    return this.app.vault.getConfig("showLineNumber")
  }
}

