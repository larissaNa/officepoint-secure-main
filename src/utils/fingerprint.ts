const STORAGE_KEY = 'officepoint_device_id';

export const getDeviceFingerprint = (): string => {
  // Tenta recuperar do localStorage para garantir persistência
  let fp = localStorage.getItem(STORAGE_KEY);

  if (!fp) {
    // Se não existir, gera um novo UUID único para este navegador/dispositivo
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      fp = crypto.randomUUID();
    } else {
      // Fallback para navegadores antigos
      fp = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    localStorage.setItem(STORAGE_KEY, fp);
  }

  return fp;
};