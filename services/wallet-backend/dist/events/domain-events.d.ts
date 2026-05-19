export declare const DOMAIN_EVENTS: {
    readonly orderPaid: "order.paid";
    readonly supplierAssigned: "order.supplier_assigned";
    readonly orderCompleted: "order.completed";
    readonly walletCredited: "wallet.credited";
    readonly discordLinkRequested: "discord.link_requested";
    readonly withdrawalRequested: "wallet.withdrawal_requested";
};
export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
