# World Tour and player profile

The 30 mission IDs remain the same, so existing stars and paid unlocks carry over. Missions 1–5 stay free; mission 6 costs 300 gold, rising by 25 gold per mission. Health/difficulty, reward amounts and mission objectives retain their progression.

| Mission | City | Country | Landmark |
| --- | --- | --- | --- |
| 1 | Lagos | Nigeria | Third Mainland Bridge |
| 2 | Abuja | Nigeria | Aso Rock |
| 3 | Accra | Ghana | Black Star Gate |
| 4 | Abidjan | Côte d’Ivoire | Saint Paul’s Cathedral |
| 5 | Dakar | Senegal | African Renaissance Monument |
| 6 | Cairo | Egypt | Pyramids of Giza |
| 7 | Addis Ababa | Ethiopia | African Union Headquarters |
| 8 | Nairobi | Kenya | KICC Tower |
| 9 | Johannesburg | South Africa | Hillbrow Tower |
| 10 | Cape Town | South Africa | Table Mountain |
| 11 | London | United Kingdom | Elizabeth Tower |
| 12 | Paris | France | Eiffel Tower |
| 13 | Rome | Italy | Colosseum |
| 14 | Barcelona | Spain | Sagrada Família |
| 15 | Istanbul | Türkiye | Bosphorus Bridge |
| 16 | Dubai | United Arab Emirates | Burj Khalifa |
| 17 | Mumbai | India | Gateway of India |
| 18 | Bangkok | Thailand | Wat Arun |
| 19 | Beijing | China | Temple of Heaven |
| 20 | Tokyo | Japan | Tokyo Tower |
| 21 | New York | United States | Statue of Liberty |
| 22 | Washington | United States | United States Capitol |
| 23 | Mexico City | Mexico | Angel of Independence |
| 24 | Rio de Janeiro | Brazil | Christ the Redeemer |
| 25 | Buenos Aires | Argentina | Obelisk |
| 26 | Sydney | Australia | Sydney Opera House |
| 27 | Singapore | Singapore | Marina Bay Sands |
| 28 | Seoul | South Korea | N Seoul Tower |
| 29 | Toronto | Canada | CN Tower |
| 30 | Athens | Greece | Parthenon |

Landmarks use bundled original stylised illustrated atlas artwork, with a procedural fallback, and stay behind gameplay collision objects. Each city has its own palette, terrain and landmark; the different castle layouts and stone themes remain. Only three city texture backgrounds are retained in memory at once. Quick Battle and Online Duel keep their existing general battlefield.

First launch: Tap to Start → Player Profile → enter a name → choose a flag → Confirm & Continue. Returning players go straight to the main menu after Tap to Start. Tap the Player Profile badge on the menu to edit. Country/territory flags are searchable by name or two-letter code; all 249 ISO entries are bundled as actual images rather than emoji, with no location permissions. Name length is limited to 18 Unicode characters and invalid/control characters are removed.

The profile contains only name and chosen flag. It is stored separately from coins and game progress; Reset Progress preserves it. Clearing app data/uninstalling can remove it. There is no login or cross-device cloud save in this revision.

The chosen flag and name appear on the menu, on the player castle and in the battle HUD. Campaign enemies display the destination flag. Online names/flags are validated by the server and carried in both room and match/recovery snapshots. **Redeploy the updated server as well as rebuilding the Android app** to display both online flags. Existing unmodified clients can still play, with a missing flag where no valid choice was sent.

Flags are from flag-icons (MIT). Source SVGs and licence are in artwork/flags; src/images/flag-atlas.png is the runtime atlas. tools/prepare_flag_atlas.py regenerates it with Pillow/CairoSVG. No additional Python packages are needed to build/run the game.

Build normally with npm install, npm run build, npx cap sync android, then gradlew assembleDebug in android. Preserve local.properties, signing configuration and any configured billing public key. Package remains com.maximcinestudios.fortressfrenzy.
