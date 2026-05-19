"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalAuthGuard = void 0;
const common_1 = require("@nestjs/common");
let InternalAuthGuard = class InternalAuthGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const expected = process.env.WALLET_BACKEND_TOKEN?.trim();
        if (!expected) {
            return true;
        }
        const authorization = request.headers.authorization;
        const header = Array.isArray(authorization) ? authorization[0] : authorization;
        const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
        if (!token || token !== expected) {
            throw new common_1.UnauthorizedException("Invalid internal token.");
        }
        return true;
    }
};
exports.InternalAuthGuard = InternalAuthGuard;
exports.InternalAuthGuard = InternalAuthGuard = __decorate([
    (0, common_1.Injectable)()
], InternalAuthGuard);
//# sourceMappingURL=internal-auth.guard.js.map