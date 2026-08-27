export class OpenSkyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenSkyAuthError';
  }
}

export class OpenSkyRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'OpenSkyRequestError';
  }
}

export class OpenSkyRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`OpenSky credits exhausted, retry in ${retryAfterSeconds}s`);
    this.name = 'OpenSkyRateLimitError';
  }
}
