export const AD_RULES = Object.freeze({ battles: 4, intervalMs: 5 * 60 * 1000 });
export function createAdManager({ bridge, supported, readPacing, writePacing, creditReward, lock = () => () => {}, now = Date.now }) {
  let pacing=readPacing() || {}, startedAt=now(), initialized=false, initialization=null, allowed=false;
  let ready={rewarded:false,interstitial:false}, loading={}, loadedAt={}, busy=false, draining=null;
  let privacyRequired=false, testMode=true;
  const save=()=>writePacing(pacing);
  const markShown=()=>{pacing={count:0,lastShown:now()};save();};
  const recover=()=>{
    if(!supported)return Promise.resolve(0);
    if(draining)return draining;
    draining=(async()=>{
      const result=await bridge.pendingRewards();let added=0;
      for(const item of result.rewards || []){
        if(!item.claimId || !Number.isSafeInteger(item.amount) || item.amount<=0 || item.amount>10000)continue;
        if(creditReward(item.claimId,item.amount))added+=item.amount;
        await bridge.acknowledgeReward({claimId:item.claimId});
      }
      return added;
    })().finally(()=>{draining=null;});return draining;
  };
  const prepare=(kind, explicit=false)=>{
    if(!allowed||(busy&&!explicit))return Promise.resolve(false);
    if(ready[kind]&&now()-(loadedAt[kind]||0)<50*60*1000)return Promise.resolve(true);
    if(loading[kind])return loading[kind];
    ready[kind]=false;
    let timer;
    loading[kind]=Promise.race([
      bridge.prepare({kind}).then(()=>true),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(false),12000);})
    ]).then(ok=>{ready[kind]=ok;if(ok)loadedAt[kind]=now();return ok;},()=>false)
      .finally(()=>{clearTimeout(timer);delete loading[kind];});
    return loading[kind];
  };
  const init=()=>{
    if(!supported)return Promise.resolve(false);
    if(initialization)return initialization;
    if(initialized)return Promise.resolve(allowed);
    busy=true;const release=lock('Preparing ad privacy settings...');
    initialization=(async()=>{
      await bridge.addListener('adShown',markShown);
      await bridge.addListener('rewardEarned',()=>recover().catch(()=>{}));
      // Pending earned rewards are independent of today's consent/network state.
      await recover().catch(()=>{});
      const result=await bridge.initialize();
      allowed=!!result.canRequestAds;privacyRequired=!!result.privacyRequired;testMode=!!result.testMode;
      initialized=true;return allowed;
    })().catch(()=>false).finally(()=>{busy=false;release();initialization=null;if(allowed){prepare('rewarded');prepare('interstitial');}});
    return initialization;
  };
  return {
    supported, init, recover, prepare,
    isBusy:()=>busy,
    privacyRequired:()=>privacyRequired,
    isTestMode:()=>testMode,
    canReward:()=>supported&&allowed,
    recordBattle(){if(!supported)return;pacing.count=Math.min(100,(Number(pacing.count)||0)+1);save();},
    eligible(){return supported&&allowed&&!busy&&(Number(pacing.count)||0)>=AD_RULES.battles&&now()-startedAt>=AD_RULES.intervalMs&&now()-(Number(pacing.lastShown)||0)>=AD_RULES.intervalMs;},
    async interstitial(){
      // Never wait for an ad to load at a navigation boundary.
      if(!this.eligible()||!ready.interstitial||now()-(loadedAt.interstitial||0)>50*60*1000){prepare('interstitial');return false;}
      busy=true;ready.interstitial=false;const release=lock('');
      try{await bridge.show({kind:'interstitial'});return true;}catch{return false;}
      finally{busy=false;release();prepare('interstitial');}
    },
    async reward(claimId,amount){
      if(!supported||!allowed||busy)return {status:'unavailable'};
      busy=true;const release=lock('Loading your reward ad...');
      try{
        // prepare() excludes concurrent shows; allow just this explicit loading request.
        const available=await prepare('rewarded',true);
        if(!available)return {status:'unavailable'};
        ready.rewarded=false;
        const result=await bridge.show({kind:'rewarded',claimId,amount});
        await recover();
        return {status:result.rewarded?'rewarded':'closed'};
      }catch{return {status:'unavailable'};}
      finally{busy=false;release();prepare('rewarded');}
    },
    async privacy(){
      if(!supported||busy)return false;
      busy=true;const release=lock('Opening privacy options...');
      try{const result=await bridge.privacy();allowed=!!result.canRequestAds;privacyRequired=!!result.privacyRequired;ready={rewarded:false,interstitial:false};return true;}
      catch{return false;}finally{busy=false;release();if(allowed){prepare('rewarded');prepare('interstitial');}}
    }
  };
}
