export const getDeviceFingerprint = (): string => {
  const fp = `${navigator.userAgent}-${screen.width}x${screen.height}`;
  return btoa(fp).substring(0, 32);
};