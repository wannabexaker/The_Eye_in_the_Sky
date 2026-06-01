import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

const extractConstraintMessage = (message: string): string => {
  if (message.includes("CHK_Wallet_BalanceNonNegative")) {
    return "Insufficient balance";
  }
  if (message.includes("CHK_Round_BetPositive")) {
    return "Bet must be positive";
  }
  if (message.includes("CHK_Round_TotalWinNonNegative")) {
    return "Total win cannot be negative";
  }
  if (message.includes("CHK_LedgerEntry_BalanceAfterNonNegative")) {
    return "Ledger balance cannot be negative";
  }
  if (message.includes("CHK_BonusState_FreeSpinsNonNegative")) {
    return "Free spins cannot be negative";
  }
  if (message.includes("CHK_BonusState_BudgetNonNegative")) {
    return "Bonus budget cannot be negative";
  }

  return "Database constraint violation";
};

@Catch()
export class DatabaseErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        code: "VALIDATION_FAILED",
        message: "Validation failed",
        fieldErrors: exception.issues.reduce<Record<string, string>>((accumulator, issue) => {
          const path = issue.path.join(".") || "form";
          if (!accumulator[path]) {
            accumulator[path] = issue.message;
          }
          return accumulator;
        }, {})
      });
      return;
    }

    // Pass HttpExceptions (BadRequestException, NotFoundException, etc.) through
    // directly so their custom body object is preserved in the HTTP response.
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002":
          response.status(HttpStatus.CONFLICT).json({
            error: "Duplicate entry",
            field: exception.meta?.target ?? null
          });
          return;
        case "P2003":
          response.status(HttpStatus.BAD_REQUEST).json({
            error: "Invalid reference - related record not found"
          });
          return;
        case "P2004":
          response.status(HttpStatus.BAD_REQUEST).json({
            error: extractConstraintMessage(exception.message)
          });
          return;
        case "P2025":
          response.status(HttpStatus.NOT_FOUND).json({
            error: "Record not found"
          });
          return;
        default:
          response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: "Database error"
          });
          return;
      }
    }

    throw exception;
  }
}
