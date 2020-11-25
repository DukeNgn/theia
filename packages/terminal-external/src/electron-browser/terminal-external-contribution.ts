/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
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

import { inject, injectable } from 'inversify';
import {
    Command,
    CommandContribution,
    CommandRegistry
} from '@theia/core/lib/common';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { QuickPickService } from '@theia/core/lib/common/quick-pick-service';
import {
    KeybindingContribution,
    KeybindingRegistry,
    LabelProvider
} from '@theia/core/lib/browser';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { TerminalExternalService } from '../common/terminal-external';
import { TerminalExternalPreferenceService } from './terminal-external-preference';

export namespace TerminalExternalCommands {
    export const OPEN_NATIVE_CONSOLE: Command = {
        id: 'workbench.action.terminal.openNativeConsole',
        label: 'Open New External Terminal'
    };
}

@injectable()
export class TerminalExternalFrontendContribution implements CommandContribution, KeybindingContribution {

    @inject(EditorManager)
    private readonly editorManager: EditorManager;

    @inject(EnvVariablesServer)
    private readonly envVariablesServer: EnvVariablesServer;

    @inject(LabelProvider)
    private readonly labelProvider: LabelProvider;

    @inject(QuickPickService)
    private readonly quickPickService: QuickPickService;

    @inject(TerminalExternalService)
    private readonly terminalExternalService: TerminalExternalService;

    @inject(TerminalExternalPreferenceService)
    private readonly terminalExternalPreferences: TerminalExternalPreferenceService;

    @inject(WorkspaceService)
    private readonly workspaceService: WorkspaceService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(TerminalExternalCommands.OPEN_NATIVE_CONSOLE, {
            execute: async () => this.openTerminalExternal()
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: TerminalExternalCommands.OPEN_NATIVE_CONSOLE.id,
            keybinding: 'shift+ctrlcmd+c'
        });
    }

    /**
     * Open a native console on the host machine.
     *
     * If multi-root workspace opened, displays a quick pick to let users choose which workspace to spawn the terminal.
     * If only one workspace opened, the terminal spawns at the root of the current workspace.
     * If no workspaces opened and there's an active editor, the terminal spawns at the parent folder of that file.
     * If no workspaces opened and no active editors, the terminal spawns at user home directory.
     */
    protected async openTerminalExternal(): Promise<void> {
        const configuration = this.terminalExternalPreferences.getTerminalExternalConfiguration();

        if (this.workspaceService.isMultiRootWorkspaceOpened) {
            const chosenWorkspaceRoot = await this.selectTerminalExternalCwd();
            if (chosenWorkspaceRoot) {
                await this.terminalExternalService.openTerminal(configuration, chosenWorkspaceRoot);
            }
            return;
        }

        if (this.workspaceService.opened) {
            const workspaceRootUri = this.workspaceService.tryGetRoots()[0].resource;
            await this.terminalExternalService.openTerminal(configuration, workspaceRootUri.toString());
            return;
        }

        const activeEditorUri = this.editorManager.activeEditor?.editor.uri;
        if (activeEditorUri) {
            await this.terminalExternalService.openTerminal(configuration, activeEditorUri.parent.toString());
        } else {
            const userHomeDir = await this.envVariablesServer.getHomeDirUri();
            await this.terminalExternalService.openTerminal(configuration, userHomeDir);
        }
    }

    /**
     * Display a quick pick for user to choose a target workspace in opened workspaces.
     */
    protected async selectTerminalExternalCwd(): Promise<string | undefined> {
        const roots = this.workspaceService.tryGetRoots();
        return this.quickPickService.show(roots.map(
            ({ resource }) => ({
                label: this.labelProvider.getName(resource),
                description: this.labelProvider.getLongName(resource),
                value: resource.toString()
            })
        ), { placeholder: 'Select current working directory for new external terminal' });
    }
}
