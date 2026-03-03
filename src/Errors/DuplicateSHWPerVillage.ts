
export default class DuplicateSHWPerVillage extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(village?: string) {
    super(
      village
        ? `A social health worker already exists for village "${village}"`
        : 'A social health worker already exists for this village'
    );
    this.name = 'DuplicateSHWPerVillage';
    this.statusCode = 409;
    this.isOperational = true;

    // Maintains proper stack trace in V8 (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }
}