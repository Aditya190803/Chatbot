'use client';
import { useMcpToolsStore } from '@repo/common/store';

import { Button } from '@repo/ui/src/components/button';
import { IconSettings2, IconTrash } from '@tabler/icons-react';

import { Badge, Input } from '@repo/ui';

import { useChatEditor } from '@repo/common/hooks';

import { useState } from 'react';

import { SETTING_TABS, useAppStore } from '../store/app.store';
import { useChatStore } from '../store/chat.store';
import { ChatEditor } from './chat-input';
import { ToolIcon } from './icons';

export const SettingsModal = () => {
    const isSettingOpen = useAppStore(state => state.isSettingsOpen);
    const setIsSettingOpen = useAppStore(state => state.setIsSettingsOpen);
    const settingTab = useAppStore(state => state.settingTab);
    const setSettingTab = useAppStore(state => state.setSettingTab);

    const settingMenu = [
        {
            icon: <IconSettings2 size={16} strokeWidth={2} className="text-muted-foreground" />,
            title: 'Customize',
            key: SETTING_TABS.PERSONALIZATION,
            component: <PersonalizationSettings />,
        },

        {
            icon: <ToolIcon />,
            title: 'MCP Tools',
            key: SETTING_TABS.MCP_TOOLS,
            component: <MCPSettings />,
        },
    ];

    if (!isSettingOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 z-40 bg-black/50" 
                onClick={() => setIsSettingOpen(false)}
            />
            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg h-full max-h-[600px] max-w-[760px] w-full overflow-x-hidden p-0">
                    <div className="no-scrollbar relative max-w-full overflow-y-auto overflow-x-hidden h-full">
                        <h3 className="border-border mx-5 border-b py-4 text-lg font-bold">Settings</h3>
                        <div className="flex flex-row gap-6 p-4">
                            <div className="flex w-[160px] shrink-0 flex-col gap-1">
                                {settingMenu.map(setting => (
                                    <Button
                                        key={setting.key}
                                        rounded="full"
                                        className="justify-start"
                                        variant={settingTab === setting.key ? 'secondary' : 'ghost'}
                                        onClick={() => setSettingTab(setting.key)}
                                    >
                                        {setting.icon}
                                        {setting.title}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex flex-1 flex-col overflow-hidden px-4">
                                {settingMenu.find(setting => setting.key === settingTab)?.component}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export const MCPSettings = () => {
    const [isAddToolDialogOpen, setIsAddToolDialogOpen] = useState(false);
    const { mcpConfig, addMcpConfig, removeMcpConfig, updateSelectedMCP, selectedMCP } =
        useMcpToolsStore();

    return (
        <div className="flex w-full flex-col gap-6 overflow-x-hidden">
            <div className="flex flex-col">
                <h2 className="flex items-center gap-1 text-base font-medium">MCP Tools</h2>
                <p className="text-muted-foreground text-xs">
                    Connect your MCP tools for enhanced functionality.
                </p>
            </div>
            <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-medium">
                    Connected Tools{' '}
                    <Badge
                        variant="secondary"
                        className="text-brand inline-flex items-center gap-1 rounded-full bg-transparent"
                    >
                        <span className="bg-brand inline-block size-2 rounded-full"></span>
                        {mcpConfig && Object.keys(mcpConfig).length} Connected
                    </Badge>
                </p>
                {mcpConfig &&
                    Object.keys(mcpConfig).length > 0 &&
                    Object.keys(mcpConfig).map(key => (
                        <div
                            key={key}
                            className="bg-secondary divide-border border-border flex h-12 w-full flex-1 flex-row items-center gap-2 divide-x-2 rounded-lg border px-2.5 py-2"
                        >
                            <div className="flex w-full flex-row items-center gap-2">
                                <ToolIcon /> <Badge>{key}</Badge>
                                <p className="text-muted-foreground line-clamp-1 flex-1 text-sm">
                                    {mcpConfig[key]}
                                </p>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    tooltip="Delete Tool"
                                    onClick={() => {
                                        removeMcpConfig(key);
                                    }}
                                >
                                    <IconTrash
                                        size={14}
                                        strokeWidth={2}
                                        className="text-muted-foreground"
                                    />
                                </Button>
                            </div>
                        </div>
                    ))}

                <Button
                    size="sm"
                    rounded="full"
                    className="mt-2 self-start"
                    onClick={() => setIsAddToolDialogOpen(true)}
                >
                    Add Tool
                </Button>
            </div>

            <div className="mt-6 border-t border-dashed pt-6">
                <p className="text-muted-foreground text-xs">Learn more about MCP:</p>
                <div className="mt-2 flex flex-col gap-2 text-sm">
                    <a
                        href="https://mcp.composio.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center hover:underline"
                    >
                        Browse Composio MCP Directory →
                    </a>
                    <a
                        href="https://www.anthropic.com/news/model-context-protocol"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center hover:underline"
                    >
                        Read MCP Documentation →
                    </a>
                </div>
            </div>

            <AddToolDialog
                isOpen={isAddToolDialogOpen}
                onOpenChange={setIsAddToolDialogOpen}
                onAddTool={addMcpConfig}
            />
        </div>
    );
};

type AddToolDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddTool: (tool: Record<string, string>) => void;
};

const AddToolDialog = ({ isOpen, onOpenChange, onAddTool }: AddToolDialogProps) => {
    const [mcpToolName, setMcpToolName] = useState('');
    const [mcpToolUrl, setMcpToolUrl] = useState('');
    const [error, setError] = useState('');
    const { mcpConfig } = useMcpToolsStore();

    const handleAddTool = () => {
        // Validate inputs
        if (!mcpToolName.trim()) {
            setError('Tool name is required');
            return;
        }

        if (!mcpToolUrl.trim()) {
            setError('Tool URL is required');
            return;
        }

        // Check for duplicate names
        if (mcpConfig && mcpConfig[mcpToolName]) {
            setError('A tool with this name already exists');
            return;
        }

        // Clear error if any
        setError('');

        // Add the tool
        onAddTool({
            [mcpToolName]: mcpToolUrl,
        });

        // Reset form and close dialog
        setMcpToolName('');
        setMcpToolUrl('');
        onOpenChange(false);
    };

    // Reset error when dialog opens/closes
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setError('');
            setMcpToolName('');
            setMcpToolUrl('');
        }
        onOpenChange(open);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 z-50 bg-black/50" 
                onClick={() => handleOpenChange(false)}
            />
            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold">Add New MCP Tool</h3>

                        {error && <p className="text-destructive text-sm font-medium">{error}</p>}

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Tool Name</label>
                            <Input
                                placeholder="Tool Name"
                                value={mcpToolName}
                                onChange={e => {
                                    const key = e.target.value?.trim().toLowerCase().replace(/ /g, '-');
                                    setMcpToolName(key);
                                    // Clear error when user types
                                    if (error) setError('');
                                }}
                            />
                            <p className="text-muted-foreground text-xs">
                                Will be automatically converted to lowercase with hyphens
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Tool Server URL</label>
                            <Input
                                placeholder="https://your-mcp-server.com"
                                value={mcpToolUrl}
                                onChange={e => {
                                    setMcpToolUrl(e.target.value);
                                    // Clear error when user types
                                    if (error) setError('');
                                }}
                            />
                            <p className="text-muted-foreground text-xs">
                                Example: https://your-mcp-server.com
                            </p>
                        </div>
                    </div>
                    <div className="border-border mt-4 border-t pt-4">
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="bordered"
                                rounded={'full'}
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleAddTool} rounded="full">
                                Add Tool
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};





const MAX_CHAR_LIMIT = 6000;

export const PersonalizationSettings = () => {
    const customInstructions = useChatStore(state => state.customInstructions);
    const setCustomInstructions = useChatStore(state => state.setCustomInstructions);
    const { editor } = useChatEditor({
        charLimit: MAX_CHAR_LIMIT,
        defaultContent: customInstructions,
        placeholder: 'Enter your custom instructions',
        enableEnter: true,
        onUpdate(props) {
            setCustomInstructions(props.editor.getText());
        },
    });
    return (
        <div className="flex flex-col gap-1 pb-3">
            <h3 className="text-base font-semibold">Customize your AI Response</h3>
            <p className="text-muted-foreground text-sm">
                These instructions will be added to the beginning of every message.
            </p>
            <div className=" shadow-subtle-sm border-border mt-2 rounded-lg border p-3">
                <ChatEditor editor={editor} />
            </div>
        </div>
    );
};
