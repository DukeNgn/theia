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
    FrontendApplication,
    FrontendApplicationContribution,
    KeybindingContribution,
    KeybindingRegistry,
    LabelProvider
} from '@theia/core/lib/browser';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { TerminalExternalService } from '../common/terminal-external';
import { TerminalExternalPreferencesService } from './terminal-external-preference';

export namespace TerminalExternalCommands {
    export const OPEN_NATIVE_CONSOLE: Command = {
        id: 'workbench.action.terminal.openNativeConsole',
        label: 'Open New External Terminal'
    };
}

@injectable()
export class TerminalExternalFrontendContribution implements FrontendApplicationContribution, CommandContribution, KeybindingContribution {

    @inject(EditorManager)
    private readonly editorManager: EditorManager;

    @inject(EnvVariablesServer)
    private readonly envVariablesServer: EnvVariablesServer;

    @inject(FrontendApplicationStateService)
    private readonly stateService: FrontendApplicationStateService;

    @inject(LabelProvider)
    private readonly labelProvider: LabelProvider;

    @inject(QuickPickService)
    private readonly quickPickService: QuickPickService;

    @inject(TerminalExternalService)
    private readonly terminalExternalService: TerminalExternalService;

    @inject(TerminalExternalPreferencesService)
    private readonly terminalExternalPreferences: TerminalExternalPreferencesService;

    @inject(WorkspaceService)
    private readonly workspaceService: WorkspaceService;

    async onStart(app: FrontendApplication): Promise<void> {
        this.stateService.reachedState('ready').then(
            () => this.terminalExternalPreferences.setHostPreferenceExec()
        );
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(TerminalExternalCommands.OPEN_NATIVE_CONSOLE, {
            execute: () => this.openTerminalExternal()
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: TerminalExternalCommands.OPEN_NATIVE_CONSOLE.id,
            keybinding: 'shift+ctrlcmd+c'
        });
    }

    /**
     * Open native console on host machine.
     */
    protected async openTerminalExternal(): Promise<void> {
        const configuration = this.terminalExternalPreferences.getTerminalExternalConfiguration();

        // Multi-root workspace opened.
        if (this.workspaceService.isMultiRootWorkspaceOpened) {
            // Display a quick pick to let users choose which workspace to spawn the terminal.
            const chosenWorkspaceRoot = await this.selectTerminalExternalCwd();
            if (chosenWorkspaceRoot) {
                await this.terminalExternalService.openTerminal(configuration, chosenWorkspaceRoot);
            }
            return;
        }

        // Only one workspace opened.
        if (this.workspaceService.opened) {
            // Spawn the terminal at the root of the current workspace.
            const workspaceRootUri = this.workspaceService.tryGetRoots()[0].resource;
            await this.terminalExternalService.openTerminal(configuration, workspaceRootUri.toString());
            return;
        }

        // No workspaces opened.
        const activeEditorUri = this.editorManager.activeEditor?.editor.uri;
        if (activeEditorUri) {
            // Spawn external terminal at the parent folder of active editor file.
            await this.terminalExternalService.openTerminal(configuration, activeEditorUri.parent.toString());
        } else {
            // Spawn external terminal at user home directory if no workspaces opened and no current active editor.
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
