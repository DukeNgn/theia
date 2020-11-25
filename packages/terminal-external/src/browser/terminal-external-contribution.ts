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

import { injectable, inject } from 'inversify';
import {
    CommandContribution,
    CommandRegistry,
    MessageService,
    Command
} from '@theia/core/lib/common';
import { KeybindingRegistry } from '@theia/core/lib/browser';

export namespace TerminalExternalCommands {
    export const OPEN: Command = {
        id: 'terminal:external:open:native:console:command',
        label: 'Open New External Terminal'
    };
}

@injectable()
export class TerminalExternalCommandContribution implements CommandContribution {

    @inject(MessageService)
    private readonly messageService: MessageService;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(TerminalExternalCommands.OPEN, {
            execute: () => this.openExternalTerminal()
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: TerminalExternalCommands.OPEN.id,
            keybinding: 'shift+ctrlcmd+c'
        });
    }

    protected openExternalTerminal(): void {
        this.messageService.info('Trigger the command');
    }
}
