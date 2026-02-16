import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const lokiUrl = process.env.LOKI_URL || 'http://loki.bingeo-obs.svc.cluster.local:3100';

const transports: pino.TransportTargetOptions[] = [];

if (isDev) {
  transports.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,service,version',
      messageFormat: '{msg}',
    },
    level: 'debug',
  });
} else {
  transports.push({
    target: 'pino/file',
    options: { destination: 1 },
    level: 'info',
  });
}

if (!isDev && lokiUrl && lokiUrl !== 'not configured') {
  transports.push({
    target: 'pino-loki',
    options: {
      host: lokiUrl,
      labels: {
        app: 'identity-service',
        env: process.env.NODE_ENV || 'development',
      },
      batching: true,
      interval: 2,
    },
    level: 'info',
  });
}

const transport = pino.transport({ targets: transports });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: {
      service: 'identity-service',
      version: '0.0.1',
    },
  },
  transport,
);

export default logger;
