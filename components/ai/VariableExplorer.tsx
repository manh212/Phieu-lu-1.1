import React, { useState, useMemo } from 'react';
import { KnowledgeBase } from '@/types/index';
import OffCanvasPanel from '@/components/ui/OffCanvasPanel';
import Button from '@/components/ui/Button';

// Recursive component to render a node in the object tree
const DataNode: React.FC<{
    nodeKey: string;
    nodeValue: any;
    parentPath: string;
    onSelect: (path: string, value: any) => void;
}> = React.memo(({ nodeKey, nodeValue, parentPath, onSelect }) => {
    const isObject = typeof nodeValue === 'object' && nodeValue !== null;
    const fullPath = parentPath ? `${parentPath}.${nodeKey}` : nodeKey;

    if (!isObject) {
        // Leaf node (primitive value)
        return (
            <div
                className="pl-4 py-1.5 text-sm cursor-pointer hover:bg-gray-700 rounded-md"
                onClick={() => onSelect(fullPath, nodeValue)}
                title={`Click to select: ${fullPath}`}
            >
                <span className="text-cyan-400">{nodeKey}:</span>{' '}
                <span className="text-amber-300 whitespace-pre-wrap break-words">{JSON.stringify(nodeValue)}</span>
            </div>
        );
    }

    // Branch node (object or array)
    return (
        <details className="pl-4 group" open={false}>
            <summary className="py-1.5 text-sm list-none cursor-pointer hover:bg-gray-700 rounded-md flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 transition-transform duration-150 group-open:rotate-90 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-indigo-300 font-semibold">{nodeKey}</span>
                <span className="text-gray-500 ml-2">{Array.isArray(nodeValue) ? `[${nodeValue.length}]` : `{...}`}</span>
            </summary>
            <div className="border-l border-gray-600 ml-2">
                {Object.entries(nodeValue).map(([key, value]) => (
                    <DataNode
                        key={key}
                        nodeKey={key}
                        nodeValue={value}
                        parentPath={fullPath}
                        onSelect={onSelect}
                    />
                ))}
            </div>
        </details>
    );
});


interface VariableExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: KnowledgeBase;
  showNotification: (message: string, type: 'success' | 'info') => void;
}

const VariableExplorer: React.FC<VariableExplorerProps> = ({ isOpen, onClose, knowledgeBase, showNotification }) => {
    const [selectedPath, setSelectedPath] = useState<string>('');
    const [selectedValue, setSelectedValue] = useState<string>('');

    const handleSelect = (path: string, value: any) => {
        setSelectedPath(`{{${path}}}`);
        setSelectedValue(JSON.stringify(value, null, 2));
    };

    const handleCopy = () => {
        if (selectedPath) {
            navigator.clipboard.writeText(selectedPath);
            showNotification(`Đã sao chép: ${selectedPath}`, 'success');
        }
    };
    
    // Create a safe copy for rendering that doesn't include potentially huge or circular structures
    const kbForDisplay = useMemo(() => {
        const { ragVectorStore, turnHistory, ...rest } = knowledgeBase;
        return rest;
    }, [knowledgeBase]);

    return (
        <OffCanvasPanel isOpen={isOpen} onClose={onClose} title="Trình Khám Phá Biến">
            <div className="flex flex-col h-full">
                {/* Info Panel at the top */}
                <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-lg border border-gray-600 mb-4 sticky top-0 z-10">
                    <h3 className="text-md font-semibold text-gray-300 mb-2">Thông tin đã chọn</h3>
                    {selectedPath ? (
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs text-gray-400 block">Đường dẫn Đạo-Script:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={selectedPath}
                                        className="w-full text-sm bg-gray-800 p-1.5 rounded border border-gray-500 font-mono"
                                    />
                                    <Button size="sm" variant="secondary" onClick={handleCopy} className="!px-3">Sao chép</Button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block">Giá trị hiện tại:</label>
                                <pre className="text-xs bg-gray-800 p-2 rounded border border-gray-500 max-h-24 overflow-y-auto custom-scrollbar">{selectedValue}</pre>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">Nhấn vào một thuộc tính bên dưới để xem chi tiết.</p>
                    )}
                </div>

                {/* Tree View */}
                <div className="flex-grow overflow-y-auto custom-scrollbar -ml-4">
                    <DataNode
                        nodeKey="knowledgeBase"
                        nodeValue={kbForDisplay}
                        parentPath={''}
                        onSelect={handleSelect}
                    />
                </div>
            </div>
        </OffCanvasPanel>
    );
};

export default VariableExplorer;
