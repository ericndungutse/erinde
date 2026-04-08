import path from "node:path";
import { fileURLToPath } from "node:url";
import pino, { type LoggerOptions } from "pino";

function getCallerSource(): string | undefined {
  const stack = new Error().stack;
  if (!stack) {
    return undefined;
  }

  const lines = stack.split("\n").slice(2);

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.includes("logger.ts") ||
      trimmed.includes("node:internal") ||
      trimmed.includes("internal/") ||
      trimmed.includes("[eval]")
    ) {
      continue;
    }

    const withParenMatch = trimmed.match(/\((.*):(\d+):(\d+)\)$/);
    const directMatch = trimmed.match(/at (.*):(\d+):(\d+)$/);
    const match = withParenMatch || directMatch;

    if (!match) {
      continue;
    }

    let filePath = match[1];
    const lineNumber = match[2];

    if (filePath.startsWith("file://")) {
      try {
        filePath = fileURLToPath(filePath);
      } catch {
        // Keep original value if URL cannot be parsed.
      }
    }

    const normalizedFilePath = path.normalize(filePath);

    if (
      normalizedFilePath.includes(`${path.sep}node_modules${path.sep}`) ||
      normalizedFilePath.endsWith(`${path.sep}logger.ts`)
    ) {
      continue;
    }

    const relativePath = path.relative(process.cwd(), normalizedFilePath);
    const displayPath =
      relativePath && !relativePath.startsWith("..")
        ? relativePath.replace(/\\/g, "/")
        : path.basename(normalizedFilePath);

    return `${displayPath}:${lineNumber}`;
  }

  return undefined;
}

// Define the configuration object with proper typing
const pinoConfig: LoggerOptions = {
  // 1. Level Strategy
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "trace"),

  // 2. Redaction Strategy (Standard for Erinde)
  redact: {
    paths: [
      "password",
      "*.password", // Catch nested passwords in objects
      "credentials.password",
      "token",
      "*.token",
      "email",
      "phoneNumber",
      "identifier", // Catch the login identifier
    ],
    censor: "***REDACTED***", // Industry standard placeholder
  },
};

if (process.env.NODE_ENV !== "production") {
  pinoConfig.mixin = () => {
    const source = getCallerSource();
    return source ? { source } : {};
  };
}

// 3. Environment-based Transport (Solves the TS "undefined" error)
if (process.env.NODE_ENV !== "production") {
  pinoConfig.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "UTC:standard",
      // Converts times to localtime
      // translateTime: 'SYS:standard',
      ignore: "pid,hostname", // Cleaner dev logs
    },
  };
}

export const logger = pino(pinoConfig);
