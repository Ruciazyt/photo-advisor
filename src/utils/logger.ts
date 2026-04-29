import { __DEV__ } from 'react-native';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const TAG = '[PhotoAdvisor]';

const log = (level: LogLevel, tag: string, message: string, ...args: unknown[]) => {
  if (!__DEV__) return; // silence in production
  const full = `${TAG}${tag ? `:${tag}` : ''}`;
  const fullMsg = args.length > 0
    ? `${message} ${args.map(a => String(a)).join(' ')}`
    : message;
  switch (level) {
    case 'debug': console.debug(`${full}`, fullMsg); break;
    case 'info':  console.info(`${full}`, fullMsg);  break;
    case 'warn':  console.warn(`${full}`, fullMsg);  break;
    case 'error': console.error(`${full}`, fullMsg); break;
  }
};

export const logger = {
  debug: (message: string, ...args: unknown[]) => log('debug', '', message, ...args),
  info:  (message: string, ...args: unknown[]) => log('info',  '', message, ...args),
  warn:  (message: string, ...args: unknown[]) => log('warn',  '', message, ...args),
  error: (message: string, ...args: unknown[]) => log('error', '', message, ...args),
  for: (tag: string) => ({
    debug: (message: string, ...args: unknown[]) => log('debug', tag, message, ...args),
    info:  (message: string, ...args: unknown[]) => log('info',  tag, message, ...args),
    warn:  (message: string, ...args: unknown[]) => log('warn',  tag, message, ...args),
    error: (message: string, ...args: unknown[]) => log('error', tag, message, ...args),
  }),
};