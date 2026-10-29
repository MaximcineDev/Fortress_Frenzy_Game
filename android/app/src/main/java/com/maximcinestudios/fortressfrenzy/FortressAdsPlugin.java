package com.maximcinestudios.fortressfrenzy;

import android.content.SharedPreferences;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.interstitial.*;
import com.google.android.gms.ads.rewarded.*;
import com.google.android.ump.*;

@CapacitorPlugin(name="FortressAds")
public class FortressAdsPlugin extends Plugin {
    private ConsentInformation consent;
    private boolean initialized=false, showing=false;
    private int requestGeneration=0;
    private RewardedAd rewarded;
    private InterstitialAd interstitial;
    private long rewardLoadedAt=0, interstitialLoadedAt=0;
    private SharedPreferences rewards;
    @Override public void load() {
        consent=UserMessagingPlatform.getConsentInformation(getContext());
        rewards=getContext().getSharedPreferences("ff_pending_ad_rewards",0);
    }
    private boolean testMode(){return getContext().getResources().getBoolean(R.bool.admob_test_mode);}
    private JSObject status(){
        JSObject out=new JSObject();out.put("canRequestAds",consent.canRequestAds());
        out.put("privacyRequired",consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED);
        out.put("testMode",testMode());return out;
    }
    private void finishInit(PluginCall call){
        if(!consent.canRequestAds()){call.resolve(status());return;}
        if(initialized){call.resolve(status());return;}
        MobileAds.initialize(getContext(),result->{initialized=true;call.resolve(status());});
    }
    @PluginMethod public void initialize(PluginCall call){
        getActivity().runOnUiThread(()->consent.requestConsentInfoUpdate(getActivity(),new ConsentRequestParameters.Builder().build(),
            ()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(getActivity(),error->finishInit(call)),
            error->finishInit(call)));
    }
    @PluginMethod public void privacy(PluginCall call){
        getActivity().runOnUiThread(()->{
            requestGeneration++;rewarded=null;interstitial=null;
            if(consent.getPrivacyOptionsRequirementStatus()!=ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED){call.resolve(status());return;}
            UserMessagingPlatform.showPrivacyOptionsForm(getActivity(),error->{
                if(error!=null)call.reject("Privacy options are unavailable. Please try again.");else call.resolve(status());
            });
        });
    }
    private String unit(boolean reward){
        if(testMode())return reward?"ca-app-pub-3940256099942544/5224354917":"ca-app-pub-3940256099942544/1033173712";
        return getContext().getString(reward?R.string.admob_rewarded_unit:R.string.admob_interstitial_unit);
    }
    @PluginMethod public void prepare(PluginCall call){
        final boolean reward="rewarded".equals(call.getString("kind"));
        getActivity().runOnUiThread(()->{
            if(!initialized||!consent.canRequestAds()||showing){call.reject("Ads are unavailable.");return;}
            final int generation=requestGeneration;
            AdRequest request=new AdRequest.Builder().build();
            if(reward)RewardedAd.load(getContext(),unit(true),request,new RewardedAdLoadCallback(){
                @Override public void onAdLoaded(RewardedAd ad){if(generation!=requestGeneration){call.reject("Privacy settings changed.");return;}rewarded=ad;rewardLoadedAt=System.currentTimeMillis();call.resolve();}
                @Override public void onAdFailedToLoad(LoadAdError error){rewarded=null;call.reject("No reward ad is available. Please try later.");}
            });
            else InterstitialAd.load(getContext(),unit(false),request,new InterstitialAdLoadCallback(){
                @Override public void onAdLoaded(InterstitialAd ad){if(generation!=requestGeneration){call.reject("Privacy settings changed.");return;}interstitial=ad;interstitialLoadedAt=System.currentTimeMillis();call.resolve();}
                @Override public void onAdFailedToLoad(LoadAdError error){interstitial=null;call.reject("No ad is available.");}
            });
        });
    }
    @PluginMethod public void show(PluginCall call){
        final boolean reward="rewarded".equals(call.getString("kind"));
        final String claimId=call.getString("claimId","");final int amount=call.getInt("amount",0);
        getActivity().runOnUiThread(()->{
            if(showing||!initialized||!consent.canRequestAds()){call.reject("Ads are unavailable.");return;}
            if(reward&&(claimId.isEmpty()||amount<=0||amount>10000)){call.reject("Invalid reward.");return;}
            final RewardedAd r=rewarded;final InterstitialAd i=interstitial;
            long loadedAt=reward?rewardLoadedAt:interstitialLoadedAt;
            if((reward&&r==null)||(!reward&&i==null)||System.currentTimeMillis()-loadedAt>55*60*1000L){call.reject("Ad expired. Please try again.");return;}
            showing=true;if(reward)rewarded=null;else interstitial=null;
            final boolean[] earned={false};
            FullScreenContentCallback callbacks=new FullScreenContentCallback(){
                @Override public void onAdShowedFullScreenContent(){JSObject e=new JSObject();e.put("kind",reward?"rewarded":"interstitial");notifyListeners("adShown",e);}
                @Override public void onAdDismissedFullScreenContent(){showing=false;JSObject out=new JSObject();out.put("rewarded",earned[0]);call.resolve(out);}
                @Override public void onAdFailedToShowFullScreenContent(AdError error){showing=false;call.reject("Ad could not be shown. Please try later.");}
            };
            if(reward){r.setFullScreenContentCallback(callbacks);r.show(getActivity(),item->{
                // Persist callback before notifying WebView; replay safely after process death.
                if(rewards.edit().putInt(claimId,amount).commit()){
                    earned[0]=true;notifyListeners("rewardEarned",new JSObject());
                }
            });}
            else{i.setFullScreenContentCallback(callbacks);i.show(getActivity());}
        });
    }
    @PluginMethod public void pendingRewards(PluginCall call){
        JSArray items=new JSArray();
        for(String key:rewards.getAll().keySet()){
            JSObject item=new JSObject();item.put("claimId",key);item.put("amount",rewards.getInt(key,0));items.put(item);
        }
        JSObject out=new JSObject();out.put("rewards",items);call.resolve(out);
    }
    @PluginMethod public void acknowledgeReward(PluginCall call){
        String key=call.getString("claimId","");
        if(rewards.edit().remove(key).commit())call.resolve();else call.reject("Reward confirmation will retry.");
    }
}
