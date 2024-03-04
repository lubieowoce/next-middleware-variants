import { createExperimentClient } from "./experiment-client";

export const getGlobalExperimentClient = once(() =>
  createExperimentClient({
    sdkKey: process.env["EXPERIMENT_CLIENT_SDK_KEY"] ?? "<SDK KEY PLACEHOLDER>",
  }),
);

function once<T extends {}>(create: () => T): () => T {
  let cached: T = undefined!;
  return () => {
    if (!cached) {
      cached = create();
    }
    return cached;
  };
}
