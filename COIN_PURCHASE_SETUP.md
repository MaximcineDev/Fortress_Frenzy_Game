# Google Play coin packs

The Shop opens to Gold Packs and Castle Skins categories; each opens its own purchase view. Suggested preview prices are $0.99 / $1.99 / $3.99 / $7.99 USD respectively. Set those prices (or your chosen alternatives) in Play Console; changing an in-game preview does not set a Play price. Live localised Play prices always replace previews. Gold packs are repeatable consumable one-time products. No payment or free gold is simulated in the browser. Real purchases remain unavailable until Play Console products and your app's licensing public key are configured.

| Product ID (exact) | Name | Gold |
| --- | --- | ---: |
| ff_gold_300 | Coin Pouch | 300 |
| ff_gold_800 | Soldier Chest | 800 |
| ff_gold_1800 | Royal Chest | 1800 |
| ff_gold_4000 | Kingdom Vault | 4000 |

## Activate in Play Console

1. Use the Play Console app matching the Android application ID `com.maximcinestudios.fortressfrenzy`. Complete your payments/merchant setup.
2. Under Monetise with Play / Products / One-time products, create each product using the exact IDs above. Create an active **buy** purchase option, set regional availability and your own prices, then activate it. Do not create subscriptions or rental offers. Keep multi-quantity disabled initially.
3. Obtain this app's Base64 **licensing public key** in Play Console's monetisation/licensing settings. Paste it inside the `play_billing_public_key` string in `android/app/src/main/res/values/billing.xml`. This is a public verification key; do not put a service-account JSON, API secret or signing key there.
4. From the project root, run `npm install`, `npm run build`, `npx cap sync android`. In `android`, use your normal signed `gradlew bundleRelease` procedure; preserve your `local.properties`. Increment the Android versionCode when uploading an update. Android Studio is not needed.
5. Upload the signed AAB to an internal testing track. Add testers and your Google Play license-testing accounts. Testers must opt in and install through the Play testing link using their tester account. A browser or ordinary sideloaded debug APK is not an end-to-end purchase test.
6. Test every product with Play test payment methods: approve, cancel, decline, pending then approved, close/reopen during delivery, repeat purchases, and relaunch. Confirm the expected gold is added exactly once. Test storage failure and interrupted delivery before public release.

Prices are fetched live from Play in the buyer's currency. A pack with no eligible Play offer shows its USD preview price and a NOT LIVE YET button; it cannot charge the player. Checkout uses a fresh product query.

## Delivery and limits

The Android minimum is now API 23 (Android 6.0) to match Play Billing. The native bridge uses Play Billing 9.1.0, signature-checks completed transactions with the licensing public key, excludes pending purchases, and passes verified purchases to the game. Gold and a receipt token are saved together before consumption. A failed durable save leaves the purchase unconsumed for retry. Repeated receipt delivery does not award gold twice. Consumption makes the pack purchasable again; Play requires completed purchases to be acknowledged/consumed within its deadline (normally three days), so test recovery thoroughly.

Startup, foreground events and opening the Shop retry unfinished deliveries. If delivery fails, reopen the app with an internet connection. Browser and iOS builds cannot purchase through this Android bridge.

The wallet and receipt ledger are still **local to this installation**, not Firebase. Reset Progress removes gold/progress but retains the receipt ledger to prevent replay of old transactions. Clearing app data or uninstalling loses local gold; consumed purchases cannot restore the wallet. Local signature checks do not replace a secure backend ledger and Google Play Developer API verification. Before a commercial launch, connect account-based server-side verification, durable wallet records and refund/revocation processing; the current local economy does not implement them.

This environment verified the web UI, storage/retry logic and web production build. It did not compile the Android project or run a real Play test checkout; those require your Android SDK, Play products, licensing key and test release.

References:
- https://developer.android.com/google/play/billing/integrate
- https://developer.android.com/google/play/billing/security
- https://developer.android.com/google/play/billing/test
