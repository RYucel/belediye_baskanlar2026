import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("KKTC-Belediye-Anket-2026", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("KKTC-Belediye-Anket-2026", 4, 17);
    return canvas.toDataURL();
  } catch (e) {
    return '';
  }
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function generateFingerprint(): string {
  const parts = [
    navigator.userAgent,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.languages ? navigator.languages.join(',') : '',
    navigator.hardwareConcurrency || '',
    getCanvasFingerprint()
  ];
  return hashCode(parts.join('||'));
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    let id = localStorage.getItem('kktc_deviceId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('kktc_deviceId', id);
    }
    setDeviceId(id);
  }, []);

  return deviceId;
}
