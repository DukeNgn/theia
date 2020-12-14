/********************************************************************************
 * Copyright (C) 2020 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from 'inversify';
import { EditorWidget } from './editor-widget';

interface RecentlyClosedEditor {
    fileUri: URI;
}

@injectable()
export class EditorHistory {
    private static MAX_STACK_ITEMS = 30;
    protected stack: RecentlyClosedEditor[];
    protected _mostRecentClosedEditor: RecentlyClosedEditor | undefined;

    @inject(EditorWidget)
    protected readonly editorWidget: EditorWidget;

    constructor() {
        this.stack = [];
        this.editorWidget.onEditorClosed(() => console.log('Close'));
    }

    append(newEditor: RecentlyClosedEditor): void {
        this.stack.push(newEditor);
    }

    editorHistory(): RecentlyClosedEditor[] {
        return this.stack;
    }

    isHistoryEmpty(): boolean {
        return this.stack.length <= 0;
    }

    mostRecentClosedEditor(): RecentlyClosedEditor | undefined {
        return this._mostRecentClosedEditor;
    }

    clearHistory(): void {
        this.stack = [];
        this._mostRecentClosedEditor = undefined;
    }

    protected historyLength(): number {
        return this.stack.length;
    }

    protected maxStackItem(): number {
        return EditorHistory.MAX_STACK_ITEMS;
    }

}
