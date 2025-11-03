import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useGame } from '../hooks/useGame';
// FIX: Corrected the import path for AIPreset to point to its definition file, resolving a module export error.
import { AIPreset } from '../types/config';
import { VIETNAMESE } from '../constants';
import { exportPresetToJSON, importPresetFromJSON } from '../services/presetService';
import Modal from './ui/Modal';
import Button from './ui/Button';
import InputField from './ui/InputField';

interface ManagePresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManagePresetsModal: React.FC<ManagePresetsModalProps> = ({ isOpen, onClose }) => {
  const { aiPresets, deleteAIPreset, renameAIPreset, importAIPresets, showNotification } = useGame();
  
  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);
  const [renamingPreset, setRenamingPreset] = useState<{ oldName: string; newName: string } | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const presetList = Object.values(aiPresets).sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
  const selectedPreset = selectedPresetName ? aiPresets[selectedPresetName] : null;
  
  useEffect(() => {
    if (!isOpen) {
      setSelectedPresetName(null);
      setRenamingPreset(null);
      setRenameError(null);
    } else if (presetList.length > 0 && !selectedPresetName) {
      setSelectedPresetName(presetList[0].metadata.name);
    }
  }, [isOpen, presetList, selectedPresetName]);

  const handleDelete = () => {
    if (selectedPreset && window.confirm(VIETNAMESE.confirmPresetDelete(selectedPreset.metadata.name))) {
      deleteAIPreset(selectedPreset.metadata.name);
      showNotification(VIETNAMESE.presetDeletedSuccess(selectedPreset.metadata.name), 'info');
      setSelectedPresetName(null); // Deselect after deletion
    }
  };

  const handleRename = () => {
      if (renamingPreset) {
          const { oldName, newName } = renamingPreset;
          const trimmedNewName = newName.trim();
          if (!trimmedNewName) {
              setRenameError(VIETNAMESE.presetNameRequiredError);
              return;
          }
          if (trimmedNewName !== oldName && aiPresets[trimmedNewName]) {
              setRenameError(VIETNAMESE.presetNameExistsError(trimmedNewName));
              return;
          }
          if (renameAIPreset(oldName, trimmedNewName)) {
              setSelectedPresetName(trimmedNewName); // Update selection to new name
              setRenamingPreset(null);
              setRenameError(null);
          }
      }
  };

  const handleExport = () => {
    if (selectedPreset) {
      exportPresetToJSON(selectedPreset);
      showNotification(VIETNAMESE.presetExportedSuccess(selectedPreset.metadata.name), 'success');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const preset = await importPresetFromJSON(text);
        importAIPresets([preset]);
      } catch (err) {
        showNotification(VIETNAMESE.presetImportError(err instanceof Error ? err.message : 'Lỗi không xác định.'), 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset file input
        }
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={VIETNAMESE.managePresetsModalTitle}>
      <div className="flex flex-col md:flex-row gap-4 h-[60vh]">
        {/* Left: Preset List */}
        <div className="w-full md:w-1/3 border border-gray-700 rounded-lg p-2 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-200 mb-2 px-2">{VIETNAMESE.presetListTitle}</h3>
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            {presetList.length > 0 ? (
              <ul>
                {presetList.map(preset => (
                  <li key={preset.metadata.name}>
                    <button
                      onClick={() => setSelectedPresetName(preset.metadata.name)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${selectedPresetName === preset.metadata.name ? 'bg-indigo-600 text-white font-semibold' : 'hover:bg-gray-700'}`}
                    >
                      {preset.metadata.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic text-center p-4">{VIETNAMESE.noPresetsAvailable}</p>
            )}
          </div>
        </div>

        {/* Right: Details & Actions */}
        <div className="w-full md:w-2/3 border border-gray-700 rounded-lg p-4 flex flex-col">
          {selectedPreset ? (
            <>
              <div>
                <h3 className="text-xl font-semibold text-indigo-300 mb-2">{selectedPreset.metadata.name}</h3>
                <p className="text-sm text-gray-400 italic mb-4">{selectedPreset.metadata.description || 'Không có mô tả.'}</p>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-700">
                  <h4 className="text-md font-semibold text-gray-300">{VIETNAMESE.presetActionsTitle}</h4>
                   {renamingPreset?.oldName === selectedPreset.metadata.name ? (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-md">
                            <InputField label={VIETNAMESE.newPresetNameLabel} id="rename-preset-input" value={renamingPreset.newName} onChange={e => setRenamingPreset({ ...renamingPreset, newName: e.target.value })} />
                            {renameError && <p className="text-xs text-red-400 -mt-2">{renameError}</p>}
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => { setRenamingPreset(null); setRenameError(null); }}>Hủy</Button>
                                <Button size="sm" variant="primary" onClick={handleRename}>Lưu tên</Button>
                            </div>
                        </div>
                   ) : (
                        <Button variant="secondary" className="w-full" onClick={() => setRenamingPreset({ oldName: selectedPreset.metadata.name, newName: selectedPreset.metadata.name })}>{VIETNAMESE.presetRenameButton}</Button>
                   )}
                  <Button variant="danger" className="w-full" onClick={handleDelete}>{VIETNAMESE.presetDeleteButton}</Button>
                  <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700" onClick={handleExport}>{VIETNAMESE.presetExportButton}</Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 italic">{VIETNAMESE.selectPresetToManage}</p>
            </div>
          )}
        </div>
      </div>
       <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
            <Button variant="primary" className="bg-sky-600 hover:bg-sky-700" onClick={handleImportClick}>{VIETNAMESE.presetImportButton}</Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,application/json" className="hidden" />
            <Button variant="secondary" onClick={onClose}>{VIETNAMESE.closeButton}</Button>
        </div>
    </Modal>
  );
};

export default ManagePresetsModal;
