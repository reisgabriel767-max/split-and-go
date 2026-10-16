export type ApplicationErrorCode =
  | "GROUP_NOT_FOUND"
  | "INVALID_MEMBERS"
  | "MEMBER_LIMIT"
  | "DUPLICATE_MEMBER"
  | "INVALID_INPUT";

export class ApplicationError extends Error {
  constructor(public readonly code: ApplicationErrorCode) {
    super(code);
    this.name = "ApplicationError";
  }
}
