import { Capacitor, registerPlugin } from '@capacitor/core';
import { packFor } from './coinPacks.js';
import { Storage } from './storage.js';
let delivery = null;
const PlayBilling = registerPlugin('FortressBilling');
export const Billing = {
  supported: () => Capacitor.getPlatform() === 'android',
  async products() {
    if (!this.supported()) return [];
    const result = await PlayBilling.products();
    return result.products || [];
  },
  async buy(id) {
    if (!packFor(id)) throw new Error('Unknown coin pack.');
    if (!this.supported()) throw new Error('Coin purchases are available in the Google Play Android app.');
    return PlayBilling.buy({ productId: id });
  },
  recover() {
    if (delivery) return delivery;
    delivery = this.deliver().finally(() => { delivery = null; });
    return delivery;
  },
  async deliver() {
    if (!this.supported()) return 0;
    const result = await PlayBilling.purchases();
    let coins = 0;
    for (const purchase of result.purchases || []) {
      const pack = packFor(purchase.productId);
      if (!pack || !purchase.token) continue;
      // Native side returns only signature-verified PURCHASED transactions.
      const credited = Storage.creditPurchase(purchase.token, pack.coins * purchase.quantity);
      await PlayBilling.consume({ token: purchase.token });
      if (credited) coins += pack.coins * purchase.quantity;
    }
    return coins;
  },
  async listen(callback) {
    if (!this.supported()) return { remove() {} };
    return PlayBilling.addListener('purchaseUpdate', callback);
  }
};
