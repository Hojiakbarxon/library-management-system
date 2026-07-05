import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

function levelFilter(level: string) {
    return winston.format((info) => (info.level === level ? info : false))();
};

const logFormat = printf(({ level, message, timestamp, stack, context }) => {
    return `${timestamp} [${context || 'App'}] ${level}: ${stack || message}`;
});

export const winstonConfig = {
    transports: [
        // Console errors - for dev
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                logFormat,
            ),
        }),

        // file - for tracking errors
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(
                levelFilter('error'),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                logFormat,
            ),
        }),
    ],
};