export const DOMAIN_EVENTS = {
  orderPaid: "order.paid",
  supplierAssigned: "order.supplier_assigned",
  orderCompleted: "order.completed",
  walletCredited: "wallet.credited",
  discordLinkRequested: "discord.link_requested",
  withdrawalRequested: "wallet.withdrawal_requested",
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];