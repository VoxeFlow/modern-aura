import { useCallback, useState } from 'react';

const INITIAL_DIALOG = {
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onConfirm: null,
    inputPlaceholder: '',
};

export function useChatDialogs() {
    const [dialog, setDialog] = useState(INITIAL_DIALOG);
    const [dialogInput, setDialogInput] = useState('');

    const openConfirm = useCallback((title, message, onConfirm) => {
        setDialog({
            isOpen: true,
            type: 'confirm',
            title,
            message,
            onConfirm,
            inputPlaceholder: '',
        });
    }, []);

    const openPrompt = useCallback((title, initialValue, onConfirm) => {
        setDialogInput(initialValue || '');
        setDialog({
            isOpen: true,
            type: 'prompt',
            title,
            message: '',
            onConfirm,
            inputPlaceholder: 'Digite aqui...',
        });
    }, []);

    const handleDialogClose = useCallback(() => {
        setDialog((prev) => ({ ...prev, isOpen: false }));
        setDialogInput('');
    }, []);

    const handleDialogConfirm = useCallback(() => {
        if (dialog.onConfirm) {
            dialog.onConfirm(dialog.type === 'prompt' ? dialogInput : true);
        }
        handleDialogClose();
    }, [dialog, dialogInput, handleDialogClose]);

    return {
        dialog,
        dialogInput,
        setDialogInput,
        openConfirm,
        openPrompt,
        handleDialogClose,
        handleDialogConfirm,
    };
}
