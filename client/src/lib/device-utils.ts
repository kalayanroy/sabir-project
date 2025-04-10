// Device identification and fingerprinting utility

/**
 * Generates a unique device identifier based on browser and device characteristics
 * This is a simplified implementation that combines various device identifiers
 */
export function generateDeviceId(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    String(navigator.hardwareConcurrency || 'unknown'),
    // deviceMemory is not available in all browsers
    String((navigator as any).deviceMemory || 'unknown'),
    String(navigator.platform || 'unknown'),
  ];
  
  // Create a hash from the components
  let hash = 0;
  const combinedString = components.join('||||');
  
  for (let i = 0; i < combinedString.length; i++) {
    const char = combinedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to a hexadecimal string
  return Math.abs(hash).toString(16);
}

/**
 * Collects information about the current device
 */
export function getDeviceInfo() {
  return {
    deviceId: generateDeviceId(),
    deviceName: navigator.platform || 'unknown',
    deviceModel: getDeviceModel(),
    devicePlatform: getDevicePlatform(),
  };
}

/**
 * Attempts to determine the device model
 */
function getDeviceModel(): string {
  const userAgent = navigator.userAgent;
  
  // This is a simplified model detection
  if (/iPhone/.test(userAgent)) {
    return 'iPhone';
  } else if (/iPad/.test(userAgent)) {
    return 'iPad';
  } else if (/Android/.test(userAgent)) {
    const match = userAgent.match(/Android\s([0-9.]+)/);
    return match ? `Android ${match[1]}` : 'Android';
  } else if (/Windows/.test(userAgent)) {
    return 'Windows Device';
  } else if (/Macintosh/.test(userAgent)) {
    return 'Mac';
  } else if (/Linux/.test(userAgent)) {
    return 'Linux Device';
  }
  
  return 'Unknown Device';
}

/**
 * Determines the device platform/OS
 */
function getDevicePlatform(): string {
  const userAgent = navigator.userAgent;
  
  if (/Windows/.test(userAgent)) {
    return 'Windows';
  } else if (/Android/.test(userAgent)) {
    return 'Android';
  } else if (/iPhone|iPad|iPod/.test(userAgent)) {
    return 'iOS';
  } else if (/Mac/.test(userAgent)) {
    return 'macOS';
  } else if (/Linux/.test(userAgent)) {
    return 'Linux';
  }
  
  return 'Unknown';
}