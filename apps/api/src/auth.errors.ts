import { HttpException } from "@nestjs/common";

export type AuthErrorCode =
  | "EMAIL_ALREADY_REGISTERED"
  | "EMAIL_NOT_FOUND"
  | "INVALID_RESET_TOKEN"
  | "PASSWORD_REUSE"
  | "RESET_TOKEN_EXPIRED"
  | "VALIDATION_FAILED"
  | "WRONG_PASSWORD";

export type AuthErrorBody = {
  code: AuthErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
};

export const authError = (
  status: number,
  code: AuthErrorCode,
  message: string,
  fieldErrors?: Record<string, string>
) =>
  new HttpException(
    {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {})
    } satisfies AuthErrorBody,
    status
  );
