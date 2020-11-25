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

import * as cp from 'child_process';
import { inject, injectable } from 'inversify';
import * as fs from 'fs-extra';
import * as path from 'path';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { OS } from '@theia/core/lib/common/os';
import URI from '@theia/core/lib/common/uri';
import { ExternalTerminalService, ExternalTerminalSettings } from '../common/terminal-external';
import { TerminalExternalPreferences } from '../browser/terminal-external-preference';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// some code copied and modified from https://github.com/microsoft/vscode/blob/1.52.1/src/vs/workbench/contrib/externalTerminal/node/externalTerminalService.ts

const TERMINAL_TITLE = 'Console';

@injectable()
export class WindowsExternalTerminalService implements ExternalTerminalService {

    @inject(TerminalExternalPreferences)
    protected readonly terminalExternalPreferences: TerminalExternalPreferences;

    @inject(EnvVariablesServer)
    protected readonly envVariablesServer: EnvVariablesServer;

    private static readonly CMD = 'cmd.exe';

    private static DEFAULT_TERMINAL_WINDOWS: string;

    openTerminal(cwd: string): void {
        this.spawnTerminal(cp, cwd);
    }

    runInTerminal(title: string, dir: string, args: string[], settings: ExternalTerminalSettings): Promise<number | undefined> {
        const terminalConfig = this.terminalExternalPreferences['terminal.external.windowsExec'];
        const exec = terminalConfig || WindowsExternalTerminalService.getDefaultTerminalName();

        return new Promise<number | undefined>((resolve, reject) => {
            const terminalTitle = title !== '' ? title : TERMINAL_TITLE;
            const consoleTitle = `"${dir} - ${terminalTitle}"`;

            // use '|' to only pause on non-zero exit code.
            const command = `""${args.join('" "')}" & pause"`;

            const cmdArgs = [
                '/c', 'start', consoleTitle, '/wait', exec, '/c', command
            ];

            // Merge environment varibles into a copy of process.env.
            const env = Object.assign({}, process.env, this.envVariablesServer.getVariables());

            // Delete environment variables that are undefined.
            Object.keys(env).filter(v => env[v] === undefined).forEach(key => delete env[key]);

            const options = {
                cwd: dir,
                env: env,
                windowsVerbatimArguments: true
            };

            const cmd = cp.spawn(WindowsExternalTerminalService.CMD, cmdArgs, options);
            cmd.on('error', err => {
                reject(improveError(err));
            });

            resolve(undefined);
        });
    }

    private spawnTerminal(spawner: typeof cp, cwd?: string): Promise<void> {
        const terminalConfig = this.terminalExternalPreferences['terminal.external.windowsExec'];
        const exec = terminalConfig || WindowsExternalTerminalService.getDefaultTerminalName();

        // const envVariables = await this.envVariablesServer.getVariables();

        // Make the drive letter uppercase on Windows.
        if (cwd && cwd[1] === ':') {
            cwd = cwd[0].toUpperCase() + cwd.substr(1);
        }

        // cmder ignores the environment cwd and instead opts to always open in %USERPROFILE%
        // unless otherwise specified.
        const basename = path.basename(exec).toLowerCase();
        if (basename === 'cmder' || basename === 'cmder.exe') {
            spawner.spawn(exec, cwd ? [cwd] : undefined);
            return Promise.resolve(undefined);
        }

        const cmdArgs = ['/c', 'start', '/wait'];
        // The "" argument is the window title. Without this, exec doesn't work when the path contains spaces.
        if (exec.indexOf(' ') >= 0) {
            cmdArgs.push('""');
        }

        cmdArgs.push(exec);

        // Add starting directory parameter for Windows Terminal.
        if (basename === 'wt' || basename === 'wt.exe') {
            cmdArgs.push('-d .');
        }

        return new Promise<void>(async (c, e) => {
            const env = cwd ? { cwd: cwd } : undefined;
            const command = await this.getWindowsShell();
            const child = spawner.spawn(command, cmdArgs, env);
            child.on('error', e);
            child.on('exit', () => c());
        });
    }

    public static getDefaultTerminalName(): string {
        if (!WindowsExternalTerminalService.DEFAULT_TERMINAL_WINDOWS) {
            const isWoW64 = !!process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
            WindowsExternalTerminalService.DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${isWoW64 ? 'Sysnative' : 'System32'}\\cmd.exe`;
        }
        return WindowsExternalTerminalService.DEFAULT_TERMINAL_WINDOWS;
    }

    private async getWindowsShell(): Promise<string> {
        const envVariables = await this.envVariablesServer.getVariables();
        const compsec = envVariables.find(e => e.name === 'compsec');
        return compsec?.value || WindowsExternalTerminalService.CMD;
    }
}

export const DEFAULT_TERMINAL_APP_OSX = 'Terminal.app';
@injectable()
export class MacExternalTerminalService implements ExternalTerminalService {

    @inject(TerminalExternalPreferences)
    protected readonly terminalExternalPreferences: TerminalExternalPreferences;

    @inject(EnvVariablesServer)
    protected readonly envVariablesServer: EnvVariablesServer;

    // osascript is the AppleScript interpreter on OS X
    private static readonly OSASCRIPT = '/usr/bin/osascript';

    private readonly iTerm = 'iTerm.app';

    public static getDefaultTerminalName(): string {
        return DEFAULT_TERMINAL_APP_OSX;
    }

    openTerminal(cwd?: string): void {
        this.spawnTerminal(cp, cwd);
    }

    runInTerminal(title: string, dir: string, args: string[]): Promise<number | undefined> {
        const terminalApp = this.terminalExternalPreferences['terminal.external.osxExec'] || DEFAULT_TERMINAL_APP_OSX;

        return new Promise<number | undefined>(async (resolve, reject) => {
            /*
            On OS X, we launch an AppleScript that creates (or reuses) a Terminal window
            then, launches the program inside that window
            */
            if (terminalApp === DEFAULT_TERMINAL_APP_OSX || terminalApp === this.iTerm) {
                const script = terminalApp === DEFAULT_TERMINAL_APP_OSX ? 'TerminalHelper' : 'iTermHelper';
                // TODO: Run the AppleScript in this directory first
                const scriptPath = new URI(`@theia/terminal-external/AppleScripts/${script}.scpt`).toString();

                const osaArgs = [
                    scriptPath,
                    '-t', title || TERMINAL_TITLE,
                    '-w', dir
                ];

                args.forEach(a => {
                    osaArgs.push('-a');
                    osaArgs.push(a);
                });

                const envVariables = await this.envVariablesServer.getVariables();
                envVariables.forEach(e => {
                    const value = e.value;
                    if (value === undefined) {
                        osaArgs.push('-u');
                        osaArgs.push(e.name);
                    } else {
                        osaArgs.push('-e');
                        osaArgs.push(`${e.name}=${value}`);
                    }

                });

                let stderr = '';
                const osa = cp.spawn(MacExternalTerminalService.OSASCRIPT, osaArgs);
                osa.on('error', err => {
                    reject(improveError(err));
                });
                osa.stderr.on('data', data => {
                    stderr += data.toString();
                });
                osa.on('exit', (code: number) => {
                    if (code === 0) {
                        resolve(undefined);
                    } else {
                        if (stderr) {
                            const lines = stderr.split('\n', 1);
                            reject(new Error(lines[0]));
                        } else {
                            reject(new Error(`Script ${script} failed with exit code ${code}`));
                        }
                    }
                });
            } else {
                reject(new Error(`${terminalApp} not supported`));
            }

        });
    }

    spawnTerminal(spawner: typeof cp, cwd?: string): Promise<void> {
        const terminalConfig = this.terminalExternalPreferences['terminal.external.osxExec'];
        const terminalApp = terminalConfig || MacExternalTerminalService.getDefaultTerminalName();

        return new Promise<void>((c, e) => {
            const args = ['-a', terminalApp];
            if (cwd) {
                args.push(cwd);
            }
            const child = spawner.spawn('/usr/bin/open', args);
            child.on('error', e);
            child.on('exit', () => c());
        });
    }

}

@injectable()
export class LinuxExternalTerminalService implements ExternalTerminalService {

    @inject(TerminalExternalPreferences)
    protected readonly terminalExternalPreferences: TerminalExternalPreferences;

    @inject(EnvVariablesServer)
    protected readonly envVariablesServer: EnvVariablesServer;

    private static DEFAULT_TERMINAL_LINUX_READY: Promise<string>;

    private static readonly WAIT_MESSAGE = 'Press any key to continue...';

    openTerminal(cwd: string): void {
        this.spawnTerminal(cp, cwd);
    }
    runInTerminal(title: string, dir: string, args: string[], settings: ExternalTerminalSettings): Promise<number | undefined> {
        const terminalConfig = this.terminalExternalPreferences['terminal.external.linuxExec'];
        const execPromise = terminalConfig ? Promise.resolve(terminalConfig) : LinuxExternalTerminalService.getDefaultTerminalName();

        return new Promise<number | undefined>((resolve, reject) => {
            const termArgs: string[] = [];

            execPromise.then(exec => {
                if (exec.indexOf('gnome-terminal') >= 0) {
                    termArgs.push('-x');
                } else {
                    termArgs.push('-e');
                }
                termArgs.push('bash');
                termArgs.push('-c');

                const bashCommand = `${quote(args)}; echo; read -p "${LinuxExternalTerminalService.WAIT_MESSAGE}" -n1;`;
                // Wrap arguement in two sets of ' because node removes one set automatically.
                termArgs.push(`''${bashCommand}''`);

                // Merge environment varibles into a copy of process.env.
                const env = Object.assign({}, process.env, this.envVariablesServer.getVariables());

                // Delete environment variables that are undefined.
                Object.keys(env).filter(v => env[v] === undefined).forEach(key => delete env[key]);

                const options = {
                    cd: dir,
                    env: env
                };

                let stderr = '';
                const cmd = cp.spawn(exec, termArgs, options);
                cmd.on('error', err => {
                    reject(improveError(err));
                });
                cmd.stderr.on('data', data => {
                    stderr += data.toString();
                });
                cmd.on('exit', (code: number) => {
                    if (code === 0) {
                        resolve(undefined);
                    } else {
                        if (stderr) {
                            const lines = stderr.split('\n', 1);
                            reject(new Error(lines[0]));
                        } else {
                            reject(new Error(`${exec} failed with exit code ${code}`));
                        }
                    }
                });
            });
        });
    }

    private spawnTerminal(spawner: typeof cp, cwd?: string): Promise<void> {
        const terminalConfig = this.terminalExternalPreferences['terminal.external.linuxExec'];
        const execPromise = terminalConfig ? Promise.resolve(terminalConfig) : LinuxExternalTerminalService.getDefaultTerminalName();

        return new Promise<void>((c, e) => {
            execPromise.then(exec => {
                const env = cwd ? { cwd } : undefined;
                const child = spawner.spawn(exec, [], env);
                child.on('error', e);
                child.on('exit', () => c());
            });
        });
    }

    public static async getDefaultTerminalName(): Promise<string> {
        if (!LinuxExternalTerminalService.DEFAULT_TERMINAL_LINUX_READY) {
            LinuxExternalTerminalService.DEFAULT_TERMINAL_LINUX_READY = new Promise(async r => {
                if (OS.type() === OS.Type.Linux) {
                    const isDebian = await fs.pathExists('etc/debian_version');
                    if (isDebian) {
                        r('x-terminal-emulator');
                    } else if (process.env.DESKTOP_SESSION === 'gnome'
                        || process.env.DESKTOP_SESSION === 'gnome-classic') {
                        r('gnome-terminal');
                    } else if (process.env.DESKTOP_SESSION === 'kde-plasma') {
                        r('konsole');
                    } else if (process.env.COLORTERM) {
                        r(process.env.COLORTERM);
                    } else {
                        r('xterm');
                    }
                } else {
                    r('xterm');
                }
            });
        }
        return LinuxExternalTerminalService.DEFAULT_TERMINAL_LINUX_READY;
    }
}

/**
 * Tries to turn OS errors into more meaningful error messages.
 */
function improveError(err: Error): Error {
    if ('errno' in err && err['errno'] === 'ENOENT' && 'path' in err && typeof err['path'] === 'string') {
        return new Error(`can't find terminal application ${err['path']}`);
    }
    return err;
}

/**
 * Quote args if necessary and combine into a space separated string.
 */
function quote(args: string[]): string {
    let r = '';
    args.forEach(a => {
        if (a.indexOf(' ') >= 0) {
            r += '"' + a + '"';
        } else {
            r += a;
        }
        r += ' ';
    });
    return r;
}
