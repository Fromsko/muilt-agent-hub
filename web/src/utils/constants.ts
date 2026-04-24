export const API_BASE_URL =
  typeof import.meta !== 'undefined' ? (import.meta.env?.PUBLIC_API_BASE_URL ?? '') : '';

export const APP_BRAND_NAME = 'AI Agent Platform';
export const APP_BRAND_SHORT = 'AAP';
export const APP_FAVICON_SRC = '/favicon.svg';

export const MOCK_ENABLED =
  typeof import.meta !== 'undefined'
    ? import.meta.env?.PUBLIC_ENABLE_MOCK === 'true'
    : false;
