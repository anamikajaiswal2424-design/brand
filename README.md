# NORTHLINE store

Next.js storefront with products, cart, address, order summary, UPI payment options and protected admin.

## Run

Use Node 20 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Production build: `npm run build`. Order validation tests: `node --test tests/*.test.mjs`.

## Vercel environment variables

Keep the existing ADMIN_PASSWORD (12+ characters), SESSION_SECRET (32+ characters), GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO and GITHUB_BRANCH settings. The GitHub token needs Contents read/write access to this repository only. Never expose it with NEXT_PUBLIC_.

Add these values to Production and Preview, then redeploy:

| Variable | Value |
|---|---|
| PAYMENT_UPI_ID | Your receiving UPI ID |
| PAYMENT_PAYEE_NAME | Name customers should see as the recipient |
| META_PIXEL_ID | Optional numeric Meta/Facebook Pixel ID |

No Meta access token or UPI PIN is needed. The payee details and Pixel ID are public configuration; GitHub tokens and admin/session secrets stay server-side. No real credentials are included in the source.

## Shopping and payment flow

Home → product → address → order summary → payment. Add to Cart and Buy Now both add the chosen variant and open the address step. The cart remains available from the header. Address details are kept in sessionStorage for the current browser tab, and are retained locally for review.

Continue to Payment still opens the payment page immediately. The server then validates the catalog prices/address and creates a pending MongoDB order in northline_orders. PhonePe opens with the reference ZIP's phonepe://native payload; the note carries the server order reference and the amount is expressed in paise. Paytm and locally generated QR remain available.

Configure the existing trusted importer connection in Vercel:

| Variable | Value |
|---|---|
| MONGODB_URI | Existing server-only MongoDB connection string |
| MONGODB_DB | paytm_db (default) |
| MONGODB_TRANSACTIONS_COLLECTION | transactions (default) |

Keep SESSION_SECRET stable and at least 32 characters. It signs the per-order access token. The browser cannot select an arbitrary amount to verify. It sends only the reference and access token; the amount comes from the stored order.

The importer must continue writing trusted bank/payment records to transactions. A matching record needs status SUCCESS, exact order ID in comment (remark is a fallback only if comment is missing/empty), and an exact numeric amount. Supported amount fields: amount, totalAmount, value. The record must be unclaimed or already claimed by that order. Ambiguous duplicate matches remain pending. Verification claims the record atomically, then updates the order to success. Keep this imported ledger restricted to the trusted importer; no browser endpoint can insert a successful bank transaction.

The browser checks status every two seconds. After verified success it waits two seconds, opens /thank-you, and rechecks the server receipt before showing confirmation. Refreshing/returning from PhonePe resumes the saved session. A deep-link return or user-supplied success flag is not accepted as proof of payment. Native-link behavior must still be tested on a real PhonePe installation with the live recipient/importer.

## Meta Pixel

The Pixel loads only after the shopper chooses Allow analytics. Every page sends PageView only; AddToCart, InitiateCheckout and AddPaymentInfo are removed. The only additional event is Purchase on /thank-you after the server verifies success. The event uses the server amount, currency INR and order ID as eventID. A local receipt marker prevents refresh duplicates; no Purchase is fired on payment/pending/failure or a direct unverified Thank You visit. Customer names, phone numbers and addresses are not passed to Pixel events. Purchase is deliberately not fired for unverified UPI activity. Use Meta Test Events and the Pixel Helper after configuring your own Pixel ID.

## Storage and admin

Products/settings: data/store.js. Verified UPI orders: MongoDB northline_orders. Legacy COD orders: data/orders.json. Admin: /admin. Vercel filesystem changes are ephemeral; the catalog/admin persist through GitHub commits; the new verified UPI checkout persists through MongoDB. Keep the repository private because orders contain customer information. GitHub JSON storage is intended for low-volume use; it does not reserve inventory or provide transactional storage under concurrent orders. Add rate limiting and use a transactional order service for substantial traffic.

The catalog is a one-time product import; Shopify stock and prices do not sync automatically. Review stock in the admin. A public feed exposes availability rather than exact inventory, so imported stock was set to a local purchase cap of 10 per product.
