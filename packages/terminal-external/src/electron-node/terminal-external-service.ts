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

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import { injectable } from 'inversify';
import { OS } from '@theia/core/lib/common/os';
import { FileUri } from '@theia/core/lib/node/file-uri';
import { TerminalExternalService, TerminalExternalConfiguration } from '../common/terminal-external';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// some code copied and modified from https://github.com/microsoft/vscode/blob/1.52.1/src/vs/workbench/contrib/externalTerminal/node/externalTerminalService.ts

@injectable()
export class WindowsTerminalExternalService implements TerminalExternalService {
    private static readonly CMD = 'cmd.exe';

    private static DEFAULT_TERMINAL_WINDOWS: string;

    async openTerminal(configuration: TerminalExternalConfiguration, cwd: string): Promise<void> {
        await this.spawnTerminal(configuration, FileUri.fsPath(cwd));
    }

    private async spawnTerminal(configuration: TerminalExternalConfiguration, cwd?: string): Promise<void> {
        const terminalConfig = configuration['terminal.external.windowsExec'];
        const exec = terminalConfig || WindowsTerminalExternalService.getDefaultTerminalWindows();

        // Make the drive letter uppercase on Windows (https://github.com/microsoft/vscode/issues/9448).
        if (cwd && cwd[1] === ':') {
            cwd = cwd[0].toUpperCase() + cwd.substr(1);
        }

        // cmder ignores the environment cwd and instead opts to always open in %USERPROFILE%
        // unless otherwise specified.
        const basename = path.basename(exec).toLowerCase();
        if (basename === 'cmder' || basename === 'cmder.exe') {
            cp.spawn(exec, cwd ? [cwd] : undefined);
            return;
        }

        const cmdArgs = ['/c', 'start', '/wait'];
        // The "" argument is the window title. Without this, exec doesn't work when the path contains spaces.
        if (exec.indexOf(' ') >= 0) {
            cmdArgs.push('""');
        }

        cmdArgs.push(exec);

        // Add starting directory parameter for Windows Terminal app.
        if (basename === 'wt' || basename === 'wt.exe') {
            cmdArgs.push('-d .');
        }

        return new Promise<void>(async (c, e) => {
            const env = cwd ? { cwd } : undefined;
            const command = this.getWindowsShell();
            const child = cp.spawn(command, cmdArgs, env);
            child.on('error', e);
            child.on('exit', () => c());
        });
    }

    async getDefaultExec(): Promise<string> {
        return WindowsTerminalExternalService.getDefaultTerminalWindows();
    }

    /**
     * Get the default terminal app on Windows.
     * (determine and initialize the variable if not found).
     */
    public static getDefaultTerminalWindows(): string {
        if (!WindowsTerminalExternalService.DEFAULT_TERMINAL_WINDOWS) {
            const isWoW64 = !!process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
            WindowsTerminalExternalService.DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${isWoW64 ? 'Sysnative' : 'System32'}\\cmd.exe`;
        }
        return WindowsTerminalExternalService.DEFAULT_TERMINAL_WINDOWS;
    }

    /**
     * Find the Windows Shell process to start up (default to cmd.exe).
     */
    private getWindowsShell(): string {
        // Find the path to cmd.exe if possible (%compsec% environment variable).
        return process.env.compsec || WindowsTerminalExternalService.CMD;
    }
}

@injectable()
export class MacTerminalExternalService implements TerminalExternalService {
    private static osxOpener = '/usr/bin/open';
    private static defaultTerminalApp = 'Terminal.app';

    async openTerminal(configuration: TerminalExternalConfiguration, cwd: string): Promise<void> {
        await this.spawnTerminal(configuration, FileUri.fsPath(cwd));
    }

    private async spawnTerminal(configuration: TerminalExternalConfiguration, cwd?: string): Promise<void> {
        const terminalConfig = configuration['terminal.external.osxExec'];
        const terminalApp = terminalConfig || MacTerminalExternalService.getDefaultTerminalOSX();
        return new Promise<void>((c, e) => {
            const args = ['-a', terminalApp];
            if (cwd) {
                args.push(cwd);
            }
            const child = cp.spawn(MacTerminalExternalService.osxOpener, args);
            child.on('error', e);
            child.on('exit', () => c());
        });
    }

    async getDefaultExec(): Promise<string> {
        return MacTerminalExternalService.getDefaultTerminalOSX();
    }

    /**
     * Get the default terminal app on OSX.
     */
    public static getDefaultTerminalOSX(): string {
        return this.defaultTerminalApp;
    }
}

@injectable()
export class LinuxTerminalExternalService implements TerminalExternalService {
    private static DEFAULT_TERMINAL_LINUX_READY: Promise<string>;

    async openTerminal(configuration: TerminalExternalConfiguration, cwd: string): Promise<void> {
        await this.spawnTerminal(configuration, FileUri.fsPath(cwd));
    }

    private async spawnTerminal(configuration: TerminalExternalConfiguration, cwd?: string): Promise<void> {
        const terminalConfig = configuration['terminal.external.linuxExec'];
        const execPromise = terminalConfig ? Promise.resolve(terminalConfig) : LinuxTerminalExternalService.getDefaultTerminalLinux();

        return new Promise<void>((c, e) => {
            execPromise.then(exec => {
                const env = cwd ? { cwd } : undefined;
                const child = cp.spawn(exec, [], env);
                child.on('error', e);
                child.on('exit', () => c());
            });
        });
    }

    async getDefaultExec(): Promise<string> {
        return LinuxTerminalExternalService.getDefaultTerminalLinux();
    }

    /**
     * Get the default terminal app on Linux.
     * (determine and initialize the variable based on desktop environment if not found)
     */
    public static async getDefaultTerminalLinux(): Promise<string> {
        if (!LinuxTerminalExternalService.DEFAULT_TERMINAL_LINUX_READY) {
            LinuxTerminalExternalService.DEFAULT_TERMINAL_LINUX_READY = new Promise(async r => {
                if (OS.type() === OS.Type.Linux) {
                    const isDebian = await fs.pathExists('/etc/debian_version');
                    if (isDebian) {
                        r('x-terminal-emulator');
                    } else if (process.env.DESKTOP_SESSION === 'gnome' || process.env.DESKTOP_SESSION === 'gnome-classic') {
                        r('gnome-terminal');
                    } else if (process.env.DESKTOP_SESSION === 'kde-plasma') {
                        r('konsole');
                    } else if (process.env.COLORTERM) {
                        r(process.env.COLORTERM);
                    } else if (process.env.TERM) {
                        r(process.env.TERM);
                    } else {
                        r('xterm');
                    }
                } else {
                    r('xterm');
                }
            });
        }
        return LinuxTerminalExternalService.DEFAULT_TERMINAL_LINUX_READY;
    }
}
