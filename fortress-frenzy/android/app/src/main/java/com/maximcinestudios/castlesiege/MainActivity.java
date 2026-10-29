package com.maximcinestudios.castlesiege;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(FortressBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
