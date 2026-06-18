import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const expected = process.env.WALLET_BACKEND_TOKEN?.trim();

    if (!expected) {
      throw new UnauthorizedException("WALLET_BACKEND_TOKEN is not configured.");
    }

    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

    if (!token || token !== expected) {
      throw new UnauthorizedException("Invalid internal token.");
    }

    return true;
  }
}