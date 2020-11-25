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

import { interfaces } from 'inversify';
import {
    createPreferenceProxy,
    PreferenceProxy,
    PreferenceSchema,
    PreferenceService,
    PreferenceContribution
} from '@theia/core/lib/browser';
import { TerminalExternalConfiguration } from '../common/terminal-external';

// The default terminal paths to be displayed on preferences.
const defaultTerminalLinux = 'x-terminal-emulator';
const defaultTerminalOSX = 'Terminal.app';
const defaultTerminalWindows = 'C:\\WINDOWS\\System32\\cmd.exe';

export const TerminalExternalConfigSchema: PreferenceSchema = {
    type: 'object',
    properties: {
        'terminal.external.windowsExec': {
            type: 'string',
            description: 'Customizes which terminal to run on Windows.',
            default: defaultTerminalWindows
        },
        'terminal.external.osxExec': {
            type: 'string',
            description: 'Customizes which terminal application to run on macOS.',
            default: defaultTerminalOSX
        },
        'terminal.external.linuxExec': {
            type: 'string',
            description: 'Customizes which terminal to run on Linux.',
            default: defaultTerminalLinux
        }
    }
};

export const TerminalExternalPreferences = Symbol('TerminalExternalPreferences');
export type TerminalExternalPreferences = PreferenceProxy<TerminalExternalConfiguration>;

export function createTerminalExternalPreferences(preferences: PreferenceService): TerminalExternalPreferences {
    return createPreferenceProxy(preferences, TerminalExternalConfigSchema);
}

export function bindTerminalExternalPreferences(bind: interfaces.Bind): void {
    bind(TerminalExternalPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createTerminalExternalPreferences(preferences);
    });
    bind(PreferenceContribution).toConstantValue({ schema: TerminalExternalConfigSchema });
}
