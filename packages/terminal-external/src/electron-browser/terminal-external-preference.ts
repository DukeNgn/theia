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

import { inject, injectable, interfaces } from 'inversify';
import {
    createPreferenceProxy,
    PreferenceProxy,
    PreferenceSchema,
    PreferenceService,
    PreferenceContribution
} from '@theia/core/lib/browser';
// import { isWindows, isOSX } from '@theia/core/lib/common/os';
import { TerminalExternalService, TerminalExternalConfiguration } from '../common/terminal-external';

export const TerminalExternalPreferences = Symbol('TerminalExternalPreferences');
export type TerminalExternalPreferences = PreferenceProxy<TerminalExternalConfiguration>;

export async function createTerminalExternalPreferences(preferences: PreferenceService): Promise<TerminalExternalPreferences> {
    return createPreferenceProxy(preferences, await TerminalExternalConfigSchema);
}

export function bindTerminalExternalPreferences(bind: interfaces.Bind): void {
    bind(TerminalExternalPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createTerminalExternalPreferences(preferences);
    });
    bind(PreferenceContribution).toConstantValue({ schema: TerminalExternalConfigSchema });
    bind(TerminalExternalPreferencesService).toSelf().inSingletonScope();
}

@injectable()
export class TerminalExternalPreferencesService {

    @inject(TerminalExternalService)
    static readonly terminalExternalService: TerminalExternalService;

    @inject(TerminalExternalPreferences)
    private readonly terminalExternalPreferences: TerminalExternalPreferences;

    static changedExec: Promise<string>;

    static async getHostExec(): Promise<string> {
        if (!TerminalExternalPreferencesService.changedExec) {
            TerminalExternalPreferencesService.changedExec = new Promise(async r => {
                const hostExec = await this.terminalExternalService.getDefaultExec();
                r(hostExec);
            });
        }
        return TerminalExternalPreferencesService.changedExec;
    }

    /*
    /**
     * Set the correct exec path based on host machine.
    async setHostPreferenceExec(): Promise<void> {
        const hostExec = await this.terminalExternalService.getDefaultExec();
        if (isWindows) {
            await this.preferences.set('terminal.external.windowsExec', hostExec, PreferenceScope.Default);
        } else if (isOSX) {
            await this.preferences.set('terminal.external.osxExec', hostExec, PreferenceScope.Default);
        } else {
            await this.preferences.set('terminal.external.linuxExec', hostExec, PreferenceScope.Default);
        }
    }
    */

    /**
     * Get the external terminal configurations from preferences.
     */
    getTerminalExternalConfiguration(): TerminalExternalConfiguration {
        return {
            'terminal.external.linuxExec': this.terminalExternalPreferences['terminal.external.linuxExec'],
            'terminal.external.osxExec': this.terminalExternalPreferences['terminal.external.osxExec'],
            'terminal.external.windowsExec': this.terminalExternalPreferences['terminal.external.windowsExec']
        };
    }
}

// export const hostExec1 = TerminalExternalPreferencesService.getHostExec().then(exec => resolve(exec));
/*
export const TerminalExternalConfigSchema: PreferenceSchema = {
    type: 'object',
    properties: {
        'terminal.external.windowsExec': {
            type: 'string',
            description: 'Customizes which terminal to run on Windows.',
            default: 'C:\\WINDOWS\\System32\\cmd.exe'
        },
        'terminal.external.osxExec': {
            type: 'string',
            description: 'Customizes which terminal application to run on macOS.',
            default: `${TerminalExternalPreferencesService.changedExec}`
        },
        'terminal.external.linuxExec': {
            type: 'string',
            description: 'Customizes which terminal to run on Linux.',
            default: 'xterm'
        }
    }
};
*/

export const TerminalExternalConfigSchema = new Promise<PreferenceSchema>(() => {
    TerminalExternalPreferencesService.changedExec.then(exec => {
        const schema: PreferenceSchema = {
            type: 'object',
            properties: {
                'terminal.external.windowsExec': {
                    type: 'string',
                    description: 'Customizes which terminal to run on Windows.',
                    default: 'C:\\WINDOWS\\System32\\cmd.exe'
                },
                'terminal.external.osxExec': {
                    type: 'string',
                    description: 'Customizes which terminal application to run on macOS.',
                    default: `${exec}`
                },
                'terminal.external.linuxExec': {
                    type: 'string',
                    description: 'Customizes which terminal to run on Linux.',
                    default: 'xterm'
                }
            }
        };
        return schema;
    });
});
