# NORTHLINE store

Next.js storefront with products, cart, address, order summary, UPI payment options and protected admin.

## Run

Use Node 20 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Production build: `npm run build`. Order validation tests: `node --test tests/upi-order.test.mjs`.

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

Continue to Payment opens the payment page immediately. UPI links and QR are then prepared independently of GitHub order writes. The server validates the selected products and calculates the payable amount from the catalog. No order is persisted by this direct payment flow; the payment reference is not proof of a saved or paid order. Address details are not sent to the payment endpoint. 

PhonePe and Paytm use Android app-targeted UPI intents. Other devices use the generic UPI chooser and QR fallback. Actual app support depends on the browser, installed app and receiving UPI account. Test with your real payee account before accepting customer payments. The website does not receive an authenticated bank/payment status from direct UPI links. Opening an app, returning to the site or scanning a QR never marks an order paid. The store must verify the payment against its receiving account manually. Automatic payment verification requires a payment gateway and authenticated server callbacks.

## Meta Pixel

The Pixel loads only after the shopper chooses Allow analytics. Events: PageView, AddToCart, InitiateCheckout and AddPaymentInfo. Customer names, phone numbers and addresses are not passed to Pixel events. Purchase is deliberately not fired for unverified UPI activity. Use Meta Test Events and the Pixel Helper after configuring your own Pixel ID.

## Storage and admin

Products/settings: data/store.js. Orders: data/orders.json. Admin: /admin. Vercel filesystem changes are ephemeral; the admin and checkout persist through GitHub commits. Keep the repository private because orders contain customer information. GitHub JSON storage is intended for low-volume use; it does not reserve inventory or provide transactional storage under concurrent orders. Add rate limiting and use a transactional order service for substantial traffic.

The catalog is a one-time product import; Shopify stock and prices do not sync automatically. Review stock in the admin. A public feed exposes availability rather than exact inventory, so imported stock was set to a local purchase cap of 10 per product.
