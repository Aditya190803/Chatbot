import { IconPlus } from '@tabler/icons-react';

import { useMcpToolsStore } from '@repo/common/store';
import { Badge, Button } from '@repo/ui';
import * as DropdownMenuComponents from '@repo/ui/src/components/dropdown-menu';

import { IconCheck, IconTools } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { SETTING_TABS, useAppStore } from '../store/app.store';
import { useChatStore } from '../store/chat.store';
import { ToolIcon } from './icons';

const {
    DropdownMenu: DropdownMenuRoot,
    DropdownMenuTrigger: DropdownMenuTriggerComponent,
    DropdownMenuContent: DropdownMenuContentComponent,
    DropdownMenuItem: DropdownMenuItemComponent,
    DropdownMenuSeparator: DropdownMenuSeparatorComponent,
} = DropdownMenuComponents as typeof import('@repo/ui/src/components/dropdown-menu');

const MenuRoot = DropdownMenuRoot as unknown as React.ComponentType<any>;
const MenuTrigger = DropdownMenuTriggerComponent as unknown as React.ComponentType<any>;
const MenuContent = DropdownMenuContentComponent as unknown as React.ComponentType<any>;
const MenuItem = DropdownMenuItemComponent as unknown as React.ComponentType<any>;
const MenuSeparator = DropdownMenuSeparatorComponent as unknown as React.ComponentType<any>;

export const ToolsMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { mcpConfig, updateSelectedMCP, selectedMCP } = useMcpToolsStore();
    const chatMode = useChatStore(state => state.chatMode);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const setSettingTab = useAppStore(state => state.setSettingTab);
    const isToolsAvailable = true; // Tools are always available with server-side API keys

    const selectedMCPTools = useMemo(() => {
        return Object.keys(mcpConfig).filter(key => mcpConfig[key]);
    }, [mcpConfig]);

    return (
        <>
            {!MenuRoot || !MenuTrigger || !MenuContent || !MenuItem || !MenuSeparator ? null : (
                <MenuRoot open={isOpen} onOpenChange={setIsOpen}>
                    <MenuTrigger asChild>
                        <Button
                            size={selectedMCP.length > 0 ? 'sm' : 'icon'}
                            tooltip="Tools"
                            variant={isOpen ? 'secondary' : 'ghost'}
                            className="gap-2"
                            rounded="full"
                        >
                            <IconTools
                                size={18}
                                strokeWidth={2}
                                className="text-muted-foreground"
                            />
                            {selectedMCPTools?.length > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="bor flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs"
                                >
                                    {selectedMCPTools.length}
                                </Badge>
                            )}
                        </Button>
                    </MenuTrigger>
                    <MenuContent align="start" side="bottom" className="w-[320px]">
                        {Object.keys(mcpConfig).map(key => (
                            <MenuItem
                                key={key}
                                onClick={() =>
                                    updateSelectedMCP(prev => {
                                        if (prev.includes(key)) {
                                            return prev.filter(mcp => mcp !== key);
                                        }
                                        return [...prev, key];
                                    })
                                }
                            >
                                <div className="flex w-full items-center justify-between gap-2">
                                    <ToolIcon />
                                    <span>{key}</span>
                                    <div className="flex-1" />
                                    {selectedMCP.includes(key) && (
                                        <IconCheck size={16} className="text-foreground" />
                                    )}
                                </div>
                            </MenuItem>
                        ))}
                        {mcpConfig && Object.keys(mcpConfig).length === 0 && (
                            <div className="flex h-[150px] flex-col items-center justify-center gap-2">
                                <IconTools
                                    size={16}
                                    strokeWidth={2}
                                    className="text-muted-foreground"
                                />
                                <p className="text-muted-foreground text-sm">No tools found</p>
                                <Button
                                    rounded="full"
                                    variant="bordered"
                                    className="text-muted-foreground text-xs"
                                    onClick={() => {
                                        setIsSettingsOpen(true);
                                        setSettingTab(SETTING_TABS.MCP_TOOLS);
                                    }}
                                >
                                    <IconPlus
                                        size={14}
                                        strokeWidth={2}
                                        className="text-muted-foreground"
                                    />
                                    Add Tool
                                </Button>
                            </div>
                        )}
                        {mcpConfig && Object.keys(mcpConfig).length > 0 && <MenuSeparator />}
                        {mcpConfig && Object.keys(mcpConfig).length > 0 && (
                            <MenuItem
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                    setSettingTab(SETTING_TABS.MCP_TOOLS);
                                }}
                            >
                                <IconPlus size={14} strokeWidth={2} className="text-muted-foreground" />
                                Add Tool
                            </MenuItem>
                        )}
                    </MenuContent>
                </MenuRoot>
            )}
        </>
    );
};
