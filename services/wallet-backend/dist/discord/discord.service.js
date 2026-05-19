"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = void 0;
const common_1 = require("@nestjs/common");
const discord_js_1 = require("discord.js");
let DiscordService = class DiscordService {
    token = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";
    rest = new discord_js_1.REST({ version: "10" }).setToken(this.token);
    client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.DirectMessages] });
    async sendAccountLinkDm(discordId, registrationUrl) {
        if (!this.token) {
            return;
        }
        const dm = (await this.rest.post(discord_js_1.Routes.userChannels(), {
            body: { recipient_id: discordId },
        }));
        await this.rest.post(discord_js_1.Routes.channelMessages(dm.id), {
            body: {
                content: `Finish your Loot Master supplier registration here: ${registrationUrl}`,
            },
        });
    }
    async sendPayoutDm(discordId, orderId, amount, currency) {
        if (!this.token) {
            return;
        }
        const dm = (await this.rest.post(discord_js_1.Routes.userChannels(), {
            body: { recipient_id: discordId },
        }));
        await this.rest.post(discord_js_1.Routes.channelMessages(dm.id), {
            body: {
                content: `You received ${amount} ${currency} for order #${orderId}. The balance is now available in your wallet.`,
            },
        });
    }
    getBotClient() {
        return this.client;
    }
};
exports.DiscordService = DiscordService;
exports.DiscordService = DiscordService = __decorate([
    (0, common_1.Injectable)()
], DiscordService);
//# sourceMappingURL=discord.service.js.map