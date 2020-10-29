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

import { inject, injectable, postConstruct } from 'inversify';
import { PluginRecommendationServiceImpl } from '../common/plugin-recommendations';
import { MessageService } from '@theia/core/lib/common';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';

export interface pluginConfiguration {
    ignoreRecommendations: boolean;
    showRecommendationsOnlyOnDemand: boolean;
    closePluginDetailsOnViewChange: boolean;
}

export const enum choiceNever {
    NEVER_SHOW_AGAIN,
    DONT_SHOW_AGAIN
}

@injectable()
class PluginRecommendationService implements PluginRecommendationServiceImpl {
    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @postConstruct()
    protected init(): void {
        console.log('Hello from plugin');
        this.workspaceService.onWorkspaceChanged(() => this.messageService.info('Plugin Recommendation activated'));
    }
}
