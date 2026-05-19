import { CanActivate, ExecutionContext } from "@nestjs/common";
export declare class InternalAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
