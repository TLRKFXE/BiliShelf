export type RecoveredInvalidVideoMetadata = {
  title?: string | null;
  coverUrl?: string | null;
  description?: string | null;
};

export function normalizeRecoveredInvalidVideoMetadata(
  input?: RecoveredInvalidVideoMetadata
): RecoveredInvalidVideoMetadata;

export function mergeRecoveredInvalidVideoFields(
  video: {
    isInvalid: boolean;
    title?: string | null;
    coverUrl?: string | null;
    description?: string | null;
  },
  recovered: RecoveredInvalidVideoMetadata
): {
  changed: boolean;
  updates: {
    title?: string;
    coverUrl?: string;
    description?: string;
  };
};
