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
import { CommandContribution } from '@theia/core/lib/common';
import {
    KeybindingContribution,
    WebSocketConnectionProvider
} from '@theia/core/lib/browser';
import { bindTerminalExternalPreferences } from './terminal-external-preference';
import { TerminalExternalFrontendContribution } from './terminal-external-contribution';
import { TerminalExternalService, terminalExternalServicePath } from '../common/terminal-external';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(TerminalExternalFrontendContribution).toSelf().inSingletonScope();
    bindTerminalExternalPreferences(bind);
    [CommandContribution, KeybindingContribution].forEach(serviceIdentifier =>
        bind(serviceIdentifier).toService(TerminalExternalFrontendContribution)
    );
    bind(TerminalExternalService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<TerminalExternalService>(ctx.container, terminalExternalServicePath)
    ).inSingletonScope();
});
