export interface BuildIndexOptions {
  file?: string | null;
  url?: string | null;
  skipLock?: boolean;
}

export interface IndexState {
  status: "ready" | "needs_build" | "incompatible";
  reason: string | null;
}

export interface RuntimeConfig {
  dataDir: string;
  cacheDir: string;
  dbPath: string;
  metadataPath: string;
  runDir: string;
  buildLockPath: string;
  serviceLockPath: string;
  readyPath: string;
  host: string;
  port: number;
  maxRows: number;
  maxResponseBytes: number;
  maxParamCount: number;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  cacheMaxEntries: number;
}

export function buildIndex(options?: BuildIndexOptions): Promise<void>;
export function startServer(): Promise<void>;
export function ensureIndexReady(config: RuntimeConfig): Promise<IndexState>;
export function getIndexState(config: RuntimeConfig): IndexState;
export function getConfig(): RuntimeConfig;
