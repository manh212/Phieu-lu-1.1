import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import InputField from './ui/InputField';
import { VIETNAMESE } from '@/constants';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  existingNames: string[];
}

const SavePresetModal: React.FC<SavePresetModalProps> = ({ isOpen, onClose, onSave, existingNames }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(VIETNAMESE.presetNameRequiredError);
      return;
    }
    if (existingNames.includes(trimmedName)) {
        setError(VIETNAMESE.presetNameExistsError(trimmedName));
        return;
    }
    onSave(trimmedName, description.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={VIETNAMESE.savePresetModalTitle}>
      <div className="space-y-4">
        <InputField
          label={VIETNAMESE.presetNameLabel}
          id="preset-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder={VIETNAMESE.presetNamePlaceholder}
          className={error ? 'border-red-500' : ''}
        />
        {error && <p className="text-sm text-red-400 -mt-2">{error}</p>}
        <InputField
          label={VIETNAMESE.presetDescriptionLabel}
          id="preset-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          // FIX: Used the correct translation key 'presetDescriptionPlaceholder' for the placeholder text.
          placeholder={VIETNAMESE.presetDescriptionPlaceholder}
          textarea
          rows={3}
        />
      </div>
      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          {VIETNAMESE.cancelEditButton}
        </Button>
        <Button variant="primary" onClick={handleSave}>
          {VIETNAMESE.saveSettingsButton}
        </Button>
      </div>
    </Modal>
  );
};

export default SavePresetModal;