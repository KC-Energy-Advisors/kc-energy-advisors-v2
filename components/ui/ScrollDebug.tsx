'use client';
'use client';

import { useEffect } from 'react';

export default function ScrollDebug() {
  useEffect(() => {
    console.log('[SCROLL DEBUG] MOUNTED');

    const log = (type: string) => (...args: any[]) => {
      console.log(`[SCROLL DEBUG] ${type}`, ...args);
    };

    const scrollHandler = log('SCROLL EVENT');

    window.addEventListener('scroll', scrollHandler);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return null;
}