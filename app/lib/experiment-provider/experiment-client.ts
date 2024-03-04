import stringHash from "string-hash";

/** A fake experiment client */
export function createExperimentClient({ sdkKey }: { sdkKey: string }) {
  return {
    async getVariation<T>(context: { userId: string }, choices: T[]) {
      const numericHash = stringHash(context.userId);
      const ix = numericHash % choices.length;
      return choices[ix];
    },
  };
}

export type ExperimentClient = ReturnType<typeof createExperimentClient>

