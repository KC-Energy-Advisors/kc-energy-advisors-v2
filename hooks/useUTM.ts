'use client';
import { useEffect } from 'react';

const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as const;
type UtmKey = (typeof UTM_KEYS)[number];

export interface UTMData {
  utm_source:   string;
  utm_medium:   string;
  utm_campaign: string;
  utm_content:  string;
  utm_term:     string;
}

/** Reads UTM params from the URL and persists them to sessionStorage. */
export function useUTM(): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach((k: UtmKey) => {
      const v = params.get(k);
      if (v) sessionStorage.setItem('kcea_' + k, v);
    });
  }, []);
}

/** Reads all UTM values from sessionStorage (call at form submission). */
export function getStoredUTMs(): UTMData {
  const get = (k: UtmKey) => sessionStorage.getItem('kcea_' + k) ?? '';
  return {
    utm_source:   get('utm_source'),
    utm_medium:   get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_content:  get('utm_content'),
    utm_term:     get('utm_term'),
  };
}
