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

import { inject, injectable, interfaces, postConstruct } from 'inversify';
import {
    createPreferenceProxy,
    PreferenceSchema,
    PreferenceService,
    PreferenceProxy
} from '@theia/core/lib/browser';
import { PreferenceSchemaProvider } from '@theia/core/lib/browser/preferences/preference-contribution';
import { isWindows, isOSX } from '@theia/core/lib/common/os';
import { TerminalExternalService, TerminalExternalConfiguration } from '../common/terminal-external';

export const TerminalExternalPreferences = Symbol('TerminalExternalPreferences');
export type TerminalExternalPreferences = PreferenceProxy<TerminalExternalConfiguration>;

export const TerminalExternalSchemaPromise = Symbol('TerminalExternalSchemaPromise');
export type TerminalExternalSchemaPromise = Promise<PreferenceSchema>;

export function bindTerminalExternalPreferences(bind: interfaces.Bind): void {
    bind(TerminalExternalSchemaPromise).toDynamicValue(
        ctx => getTerminalExternalSchema(ctx.container.get(TerminalExternalService))
    ).inSingletonScope();
    bind(TerminalExternalPreferences).toDynamicValue(
        ctx => createPreferenceProxy(
            ctx.container.get(PreferenceService),
            ctx.container.get(TerminalExternalSchemaPromise),
        )
    ).inSingletonScope();
    bind(TerminalExternalPreferenceService).toSelf().inSingletonScope();
}

@injectable()
export class TerminalExternalPreferenceService {

    @inject(TerminalExternalPreferences)
    private readonly preferences: TerminalExternalPreferences;

    @inject(PreferenceSchemaProvider)
    private readonly preferenceSchemaProvider: PreferenceSchemaProvider;

    @inject(TerminalExternalSchemaPromise)
    private readonly promisedSchema: TerminalExternalSchemaPromise;

    @postConstruct()
    protected setPreferenceSchema(): void {
        this.promisedSchema.then(schema => this.preferenceSchemaProvider.setSchema(schema));
    }

    /**
     * Get the external terminal configurations from preferences.
     */
    getTerminalExternalConfiguration(): TerminalExternalConfiguration {
        return {
            'terminal.external.linuxExec': this.preferences['terminal.external.linuxExec'],
            'terminal.external.osxExec': this.preferences['terminal.external.osxExec'],
            'terminal.external.windowsExec': this.preferences['terminal.external.windowsExec'],
        };
    }
}

/**
 * Some of the schema's properties are fetched from the backend.
 */
export async function getTerminalExternalSchema(terminalExternalService: TerminalExternalService): Promise<PreferenceSchema> {
    console.error('getting schema again');
    const hostExec = await terminalExternalService.getDefaultExec();
    return {
        type: 'object',
        properties: {
            'terminal.external.windowsExec': {
                type: 'string',
                description: 'Customizes which terminal to run on Windows.',
                default: `${isWindows ? hostExec : 'C:\\WINDOWS\\System32\\cmd.exe'}`
            },
            'terminal.external.osxExec': {
                type: 'string',
                description: 'Customizes which terminal application to run on macOS.',
                default: `${isOSX ? hostExec : 'Terminal.app'}`
            },
            'terminal.external.linuxExec': {
                type: 'string',
                description: 'Customizes which terminal to run on Linux.',
                default: `${!(isWindows || isOSX) ? hostExec : 'xterm'}`
            }
        }
    };
}
