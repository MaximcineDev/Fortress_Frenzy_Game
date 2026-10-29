import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeServerUrl} from '../src/onlineSettings.js';
test('online addresses normalize origins and reject credentials or non-web schemes',()=>{
 assert.equal(normalizeServerUrl(' https://example.com/ '),'https://example.com');assert.equal(normalizeServerUrl('http://192.168.1.4:3000'),'http://192.168.1.4:3000');
 for(const value of ['', 'example.com','javascript:alert(1)','https://name:pass@example.com','https://example.com/path','https://example.com/?token=abc'])assert.throws(()=>normalizeServerUrl(value));
});
