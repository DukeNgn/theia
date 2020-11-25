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

import { ContainerModule, interfaces } from 'inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { isWindows, isOSX } from '@theia/core/lib/common/os';
import { TerminalExternalService, terminalExternalServicePath } from '../common/terminal-external';
import { WindowsTerminalExternalService, MacTerminalExternalService, LinuxTerminalExternalService } from './terminal-external-service';

export function bindTerminalExternalService(bind: interfaces.Bind): void {
    if (isWindows) {
        bind(WindowsTerminalExternalService).toSelf().inSingletonScope();
        bind(TerminalExternalService).toService(WindowsTerminalExternalService);
    } else if (isOSX) {
        bind(MacTerminalExternalService).toSelf().inSingletonScope();
        bind(TerminalExternalService).toService(MacTerminalExternalService);
    } else {
        bind(LinuxTerminalExternalService).toSelf().inSingletonScope();
        bind(TerminalExternalService).toService(LinuxTerminalExternalService);
    }

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(terminalExternalServicePath, () =>
            ctx.container.get(TerminalExternalService)
        )
    ).inSingletonScope();
}

export default new ContainerModule(bind => {
    bindTerminalExternalService(bind);
});
