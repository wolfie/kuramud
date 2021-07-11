import loglevel, { LogLevelDesc } from "loglevel";

loglevel.enableAll(true);

type LogFn = (...msg: any[]) => void;

const wrapWithFormatAndLoggerName =
  (loggerName?: string) =>
  (fn: LogFn, prefix?: string): LogFn => {
    const prefixes: string[] = [];
    prefix && prefixes.push(prefix);
    loggerName && prefixes.push(`[${loggerName}]`);
    return (...msg) => fn(...prefixes, ...msg);
  };

type LogFns = {
  log: LogFn;
  warn: LogFn;
  error: LogFn;
  trace: LogFn;
  info: LogFn;
};

type CreateLoggerFn = {
  (loggerName: string, loglevel?: LogLevelDesc): LogFns;
  (): LogFns;
};
export const createLogger: CreateLoggerFn = (loggerName?, lvl?) => {
  const logger = loggerName
    ? loglevel.getLogger(loggerName as string)
    : loglevel;
  lvl && logger.setLevel(lvl as LogLevelDesc);

  const wrapWithFormat = wrapWithFormatAndLoggerName(
    loggerName as string | undefined
  );

  return {
    log: wrapWithFormat(logger.log),
    warn: wrapWithFormat(logger.warn, "!"),
    error: wrapWithFormat(logger.error, "!!"),
    trace: wrapWithFormat(logger.trace, "?"),
    info: wrapWithFormat(logger.info, "."),
  };
};
