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

export const TerminalExternalService = Symbol('TerminalExternalService');
export const terminalExternalServicePath = '/services/terminal-external';

export interface TerminalExternalConfiguration {
    'terminal.external.windowsExec': string
    'terminal.external.osxExec': string
    'terminal.external.linuxExec': string
}

export interface TerminalExternalService {
    /**
     * Open native terminal in the provided path.
     * @param configuration the configuration for opening external terminal.
     * @param cwd the string that terminal should start in.
     */
    openTerminal(configuration: TerminalExternalConfiguration, cwd: string): Promise<void>;
    /**
     * Determine the default exec of the external terminal.
     * @returns the string of the default terminal exec.
     */
    getDefaultExec(): Promise<string>;
}
