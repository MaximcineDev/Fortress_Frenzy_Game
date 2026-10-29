package com.maximcinestudios.castlesiege;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import android.util.Base64;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;

/** Consumable Play purchases. Entitlements are saved before consumption by the JS bridge. */
@CapacitorPlugin(name = "FortressBilling")
public class FortressBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall checkout;
    private final Set<String> ids = new HashSet<>(Arrays.asList(
        "ff_gold_300", "ff_gold_800", "ff_gold_1800", "ff_gold_4000"));
    private final Set<String> verifiedTokens = new HashSet<>();
    private boolean connecting = false;

    @Override public void load() {
        client = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void fail(PluginCall call, String message) {
        if(checkout == call)checkout = null;
        call.reject(message);
    }
    private boolean configured() { return !getContext().getString(R.string.play_billing_public_key).trim().isEmpty(); }
    private void ready(PluginCall call, Runnable action) {
        if (!configured()) { fail(call, "Coin purchases are not configured yet."); return; }
        getActivity().runOnUiThread(() -> {
            if (client.isReady()) { action.run(); return; }
            if (connecting) { fail(call, "Google Play is connecting. Please try again."); return; }
            connecting = true;
            client.startConnection(new BillingClientStateListener() {
                public void onBillingSetupFinished(BillingResult result) {
                    connecting = false;
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                    else fail(call, "Unable to connect to Google Play. Please try again.");
                }
                public void onBillingServiceDisconnected() { connecting = false; }
            });
        });
    }
    private List<QueryProductDetailsParams.Product> productList() {
        List<QueryProductDetailsParams.Product> list = new ArrayList<>();
        for (String id : ids) list.add(QueryProductDetailsParams.Product.newBuilder()
            .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        return list;
    }
    private ProductDetails.OneTimePurchaseOfferDetails offer(ProductDetails p) {
        List<ProductDetails.OneTimePurchaseOfferDetails> offers = p.getOneTimePurchaseOfferDetailsList();
        return offers == null || offers.isEmpty() ? null : offers.get(0);
    }
    @PluginMethod public void products(PluginCall call) {
        ready(call, () -> client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder()
            .setProductList(productList()).build(), (result, response) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { fail(call, "Gold packs are unavailable. Please try again."); return; }
                JSArray products = new JSArray();
                for (ProductDetails p : response.getProductDetailsList()) {
                    ProductDetails.OneTimePurchaseOfferDetails o = offer(p);
                    if (o == null) continue;
                    JSObject item = new JSObject(); item.put("id", p.getProductId()); item.put("price", o.getFormattedPrice());
                    products.put(item);
                }
                JSObject out = new JSObject();out.put("products", products);call.resolve(out);
            }));
    }
    @PluginMethod public void buy(PluginCall call) {
        String id = call.getString("productId", "");
        if (!ids.contains(id)) { fail(call, "Unknown gold pack."); return; }
        if (checkout != null) { fail(call, "A purchase is already in progress."); return; }
        checkout = call;
        ready(call, () -> client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build())).build(), (result, response) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || response.getProductDetailsList().isEmpty()) {
                    checkout = null;fail(call, "This pack is unavailable on Google Play.");return;
                }
                ProductDetails p = response.getProductDetailsList().get(0);
                ProductDetails.OneTimePurchaseOfferDetails o = offer(p);
                if(o == null) {checkout = null;fail(call, "No purchase offer is available.");return;}
                BillingFlowParams.ProductDetailsParams params = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(p).setOfferToken(o.getOfferToken()).build();
                getActivity().runOnUiThread(() -> {
                    BillingResult launched = client.launchBillingFlow(getActivity(), BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(Collections.singletonList(params)).build());
                    if(launched.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        checkout = null;fail(call, "Google Play checkout could not open. Please try again.");
                    }
                });
            }));
        // ready() can reject immediately before starting checkout.
        if(!configured()) checkout = null;
    }
    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = checkout;checkout = null;
        JSObject out = new JSObject();
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) out.put("status", "cancelled");
        else if (code == BillingClient.BillingResponseCode.OK) {
            boolean pending = false;
            if(purchases != null) for(Purchase p : purchases) {
                if(p.getPurchaseState() == Purchase.PurchaseState.PENDING)pending = true;
            }
            out.put("status", pending ? "pending" : "purchased");
        } else { if(call != null) fail(call, "Purchase failed. Please try again.");notifyListeners("purchaseUpdate", new JSObject());return; }
        if(call != null)call.resolve(out);
        notifyListeners("purchaseUpdate", out);
    }
    private boolean verified(Purchase p) {
        try {
            byte[] key = Base64.decode(getContext().getString(R.string.play_billing_public_key).trim(), Base64.DEFAULT);
            Signature sig = Signature.getInstance("SHA1withRSA");
            sig.initVerify(KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(key)));
            sig.update(p.getOriginalJson().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return sig.verify(Base64.decode(p.getSignature(), Base64.DEFAULT));
        } catch(Exception e) { return false; }
    }
    @PluginMethod public void purchases(PluginCall call) {
        ready(call, () -> client.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP).build(), (result, purchases) -> {
                if(result.getResponseCode() != BillingClient.BillingResponseCode.OK) {fail(call, "Could not check purchases.");return;}
                JSArray items = new JSArray();
                for(Purchase p : purchases) {
                    if(p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                    if(!verified(p)) {fail(call, "Purchase verification failed. No gold was added.");return;}
                    if(p.getProducts().size() != 1 || !ids.contains(p.getProducts().get(0)))continue;
                    verifiedTokens.add(p.getPurchaseToken());
                    JSObject item = new JSObject();item.put("productId",p.getProducts().get(0));item.put("token",p.getPurchaseToken());
                    item.put("quantity",p.getQuantity());items.put(item);
                }
                JSObject out = new JSObject();out.put("purchases",items);call.resolve(out);
            }));
    }
    @PluginMethod public void consume(PluginCall call) {
        String token = call.getString("token", "");
        if(!verifiedTokens.contains(token)) {fail(call, "Purchase has not been verified.");return;}
        ready(call, () -> client.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(), (result,t) -> {
            if(result.getResponseCode() == BillingClient.BillingResponseCode.OK) {verifiedTokens.remove(token);call.resolve();}
            else fail(call, "Delivery confirmation will retry.");
        }));
    }
    @Override protected void handleOnDestroy() { if(client != null)client.endConnection(); }
    @Override protected void handleOnResume() { notifyListeners("purchaseUpdate", new JSObject()); }
}
