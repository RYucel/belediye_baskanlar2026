import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

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
