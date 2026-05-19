# Internal Wallet Architecture

## Goal

This backend adds an internal supplier wallet to the current marketplace flow. It is not a crypto wallet. It is an internal financial ledger used to credit supplier balances when admins complete assigned orders.

## Integration with the current app

The existing Next.js app remains the public storefront and Discord interaction entrypoint. It now forwards three critical lifecycle events to the dedicated wallet backend:

1. `checkout.session.completed` -> `/internal/orders/paid`
2. supplier selected in admin -> `/internal/orders/assigned-supplier`
3. order marked completed -> `/internal/orders/completed`

Discord supplier apply events are also forwarded to `/internal/discord/applications`. If the supplier has no linked site account, the backend issues a secure `discord_link_token`, queues a Discord DM, and the sign-up/login flow consumes that token through `/internal/discord-link/consume` after Discord OAuth succeeds.

## Folder structure

```text
services/wallet-backend/
  prisma/
    schema.prisma
  src/
    antifraud/
    audit/
    common/
    discord/
    events/
    orders/
    prisma/
    queues/
    supplier-onboarding/
    wallet/
    withdrawals/
```

## Core guarantees

- Immutable ledger: every balance change creates a `wallet_transactions` row.
- No direct balance mutation from controllers: balances are changed only inside `WalletService` within database transactions.
- Idempotent payout: `reference_key` is unique and derived from the order completion event.
- Double payment protection: repeated `ORDER_COMPLETED` calls return the existing ledger result.
- Anti-fraud: one Discord account cannot bind to multiple site accounts, new accounts can be held before release, withdrawals have cooldown and new-account limits.
- Auditability: each critical action writes an `audit_logs` entry.

## Event flow

### Apply

1. Discord button click reaches the Next interaction endpoint.
2. Next stores the application in Firestore for the current admin UI.
3. Next forwards the application to the wallet backend.
4. Backend upserts `supplier_applications`.
5. If the supplier does not exist in `users`, the backend creates a `discord_link_tokens` row and queues a DM job.
6. The supplier receives a secure registration URL like `https://site.com/cadastro?token=...`.

### Login or sign-up

1. The supplier opens the link and starts Discord OAuth.
2. The Next callback creates or updates the Firebase profile.
3. The callback forwards `token + siteUserId + discordId` to the wallet backend.
4. Backend validates the token, links the Discord identity, creates the wallet if needed, updates open applications, and backfills assigned orders.

### Paid order sync

1. Stripe webhook persists the order in Firestore.
2. The same webhook forwards `orderId`, `totalAmount`, `supplierPayout`, currency, and metadata to the wallet backend.
3. Backend upserts the order in PostgreSQL with status `PAID`.

### Supplier assignment

1. Admin selects a supplier in the current panel.
2. Next creates the private Discord thread as it does today.
3. Next forwards the selected Discord ID to the wallet backend.
4. Backend updates `orders.assigned_supplier_discord_id` and, if already linked, `assigned_supplier_user_id`.

### Order completed

1. Admin clicks complete.
2. Next closes the Discord thread and updates Firestore server-side.
3. Next forwards the event with `Idempotency-Key` to the wallet backend.
4. Backend loads the order, confirms the supplier, runs anti-fraud checks, and writes the ledger entry.
5. `WalletService` credits `available_balance` or `locked_balance` depending on hold rules.
6. Backend queues the Discord payout DM.

## Anti-fraud controls

- Unique `users.discord_id`
- `discord_link_tokens` are single-use and time-bound
- `user_auth_fingerprints` stores IP, device fingerprint, and risk state
- new-account payout hold through `balance_holds`
- withdrawal cooldown and new-account withdrawal cap
- full `audit_logs` trail for financial actions
- KYC state ready through `kyc_verifications`

## Rollout order

1. Stand up PostgreSQL and Redis.
2. `cd services/wallet-backend && npm install`
3. Run `npm run prisma:generate`
4. Create the first Prisma migration.
5. Set `WALLET_BACKEND_URL` and `WALLET_BACKEND_TOKEN` in the Next app.
6. Deploy the backend worker for BullMQ jobs.
7. Backfill paid orders and already-linked Discord users before enabling payout automation.

## Future extensions

- escrow rows for held customer funds
- multi-currency FX tables
- settlement batches for suppliers with different payout rails
- manual finance adjustments and reconciliation views
- dispute and rollback workflows