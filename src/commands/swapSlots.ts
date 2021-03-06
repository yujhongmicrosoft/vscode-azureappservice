/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// tslint:disable-next-line:no-require-imports
import WebSiteManagementClient = require('azure-arm-website');
import { SiteClient } from 'vscode-azureappservice';
import { addExtensionUserAgent, IAzureNode, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { DeploymentSlotTreeItem } from '../explorer/DeploymentSlotTreeItem';
import { ext } from '../extensionVariables';

export async function swapSlots(sourceSlotNode: IAzureNode<DeploymentSlotTreeItem> | undefined): Promise<void> {
    if (!sourceSlotNode) {
        sourceSlotNode = <IAzureNode<DeploymentSlotTreeItem>>await ext.tree.showNodePicker(DeploymentSlotTreeItem.contextValue);
    }
    const sourceSlotClient: SiteClient = sourceSlotNode.treeItem.client;

    const productionSlotLabel: string = 'production';
    // tslint:disable-next-line:no-non-null-assertion
    const deploymentSlots: IAzureNode<DeploymentSlotTreeItem>[] = <IAzureNode<DeploymentSlotTreeItem>[]>await sourceSlotNode.parent!.getCachedChildren();
    const otherSlots: IAzureQuickPickItem<DeploymentSlotTreeItem | undefined>[] = [{
        label: productionSlotLabel,
        description: 'Swap slot with production',
        detail: '',
        data: undefined
    }];

    for (const slot of deploymentSlots) {
        if (sourceSlotClient.slotName !== slot.treeItem.client.slotName) {
            // Deployment slots must have an unique name
            const otherSlot: IAzureQuickPickItem<DeploymentSlotTreeItem | undefined> = {
                // tslint:disable-next-line:no-non-null-assertion
                label: slot.treeItem.client.slotName!,
                description: '',
                data: slot.treeItem
            };

            otherSlots.push(otherSlot);
        }
    }

    const quickPickOptions = { placeHolder: `Select which slot to swap with "${sourceSlotClient.slotName}".` };
    const targetSlot: DeploymentSlotTreeItem | undefined = (await ext.ui.showQuickPick(otherSlots, quickPickOptions)).data;

    // tslint:disable-next-line:no-non-null-assertion
    const targetSlotLabel: string = targetSlot ? targetSlot.client.slotName! : productionSlotLabel;
    ext.outputChannel.show(true);
    ext.outputChannel.appendLine(`Swapping "${targetSlotLabel}" with "${sourceSlotClient.slotName}"...`);
    const client: WebSiteManagementClient = new WebSiteManagementClient(sourceSlotNode.credentials, sourceSlotNode.subscriptionId, sourceSlotNode.environment.resourceManagerEndpointUrl);
    addExtensionUserAgent(client);
    // if targetSlot was assigned undefined, the user selected 'production'
    if (!targetSlot) {
        // tslint:disable-next-line:no-non-null-assertion
        await client.webApps.swapSlotWithProduction(sourceSlotClient.resourceGroup, sourceSlotClient.siteName, { targetSlot: sourceSlotClient.slotName!, preserveVnet: true });
    } else {
        // tslint:disable-next-line:no-non-null-assertion
        await client.webApps.swapSlotSlot(sourceSlotClient.resourceGroup, sourceSlotClient.siteName, { targetSlot: targetSlot.client.slotName!, preserveVnet: true }, sourceSlotClient.slotName!);
    }
    ext.outputChannel.appendLine(`Successfully swapped "${targetSlotLabel}" with "${sourceSlotClient.slotName}".`);
}
