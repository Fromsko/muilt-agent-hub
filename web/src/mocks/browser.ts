import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth';
import { userHandlers } from './handlers/user';

export const worker = setupWorker(...authHandlers, ...userHandlers);
