import { t } from '../i18n.js';
import { logError } from '../logger.js';
import * as masterPasswordUI from '../ui/masterPasswordUI.js';
import { refreshHistoryDisplay } from '../ui/historyUI.js';

export async function handleExportPasswords(passwordStorage, MasterPasswordService, showToast) {
  try {
    const masterPassword = MasterPasswordService.getCurrentMasterPassword();
    const settings = await passwordStorage.getSettings();
    if (settings.masterPasswordPreviouslySet && !masterPassword) {
      showToast(t('masterPasswordRequiredToViewHistory'), 'error');
      masterPasswordUI.showPrompt({ reason: 'export' });
      return;
    }
    
    const passwords = await passwordStorage.getHistory(masterPassword);
    
    if (passwords.some(p => p.password.startsWith('[Decryption Failed]'))) {
       showToast(t('masterPasswordSeemsIncorrectWarning'), 'error');
       return;
    }

    const passwordsToExport = passwords.map(({ id, password, timestamp, tags }) => ({ id, password, timestamp, tags }));

    const passwordsString = JSON.stringify(passwordsToExport, null, 2);
    const blob = new Blob([passwordsString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passwords-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    logError(error, 'handleExportPasswords');
    showToast(t('exportError'), 'error');
  }
}

export function handleImportPasswords(event, passwordStorage, MasterPasswordService, showToast) {
  const file = event.target.files[0];
  const importPasswordsInput = document.getElementById('importPasswordsInput');

  if (!file) {
    showToast(t('noFileSelected'), 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const importedPasswords = JSON.parse(text);

      if (!Array.isArray(importedPasswords)) {
        throw new Error("Invalid file format: not an array.");
      }

      const masterPassword = MasterPasswordService.getCurrentMasterPassword();
      const settings = await passwordStorage.getSettings();

      if (settings.masterPasswordPreviouslySet && !masterPassword) {
          showToast(t('masterPasswordRequiredToImport'), 'error');
          masterPasswordUI.showPrompt({ reason: 'import' });
          return;
      }

      for (const p of importedPasswords) {
          if (p.password) {
               await passwordStorage.savePassword(p.password, masterPassword, { timestamp: p.timestamp, tags: p.tags });
          }
      }
      
      await refreshHistoryDisplay();
      
      showToast(t('passwordsImportedSuccess'));
    } catch (error) {
      logError(error, 'handleImportPasswords');
      showToast(t('passwordsImportedError'), 'error');
    } finally {
      if(importPasswordsInput) importPasswordsInput.value = '';
    }
  };
  reader.onerror = (error) => {
      logError(error, 'FileReader error in password import');
      showToast(t('passwordsImportedError'), 'error');
      if(importPasswordsInput) importPasswordsInput.value = '';
  };
  reader.readAsText(file);
} 