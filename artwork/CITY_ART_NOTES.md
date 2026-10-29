# World Tour background artwork

Five original background atlases were created using the built-in image-generation tool, then encoded as WebP for the game. Each atlas has two columns and three rows of six landscape scenes. Tile order is left-to-right, top-to-bottom. These are stylised travel backdrops for a fictional game, not documentary photographs or geographically exact city models.

Prompt template: “Create a game-ready texture atlas, exactly two columns and three rows of six distinct rectangular landscape illustrated background paintings. Square overall image, no gutters, labels, borders, typography, watermarks or characters. Premium colourful polished hand-painted 3D cartoon medieval artillery mobile-game aesthetic, soft volumetric sunlight, dimensional architecture, blue/gold warm palette. Recognisable city landmark large in the middle distance, distant skyline, open grassy or sandy battlefield ground at the bottom, clear sky above. No foreground castles, soldiers, weapons or UI. Same camera and ground placement in each tile.”

The prompt then specified the landmarks in the following strict order:

- city-atlas-1.webp: Lagos / Third Mainland Bridge; Abuja / Aso Rock; Accra / Black Star Gate; Abidjan / Saint Paul's Cathedral; Dakar / African Renaissance Monument; Cairo / Pyramids of Giza.
- city-atlas-2.webp: Addis Ababa / African Union Headquarters; Nairobi / KICC Tower; Johannesburg / Hillbrow Tower; Cape Town / Table Mountain; London / Elizabeth Tower; Paris / Eiffel Tower.
- city-atlas-3.webp: Rome / Colosseum; Barcelona / Sagrada Família; Istanbul / Bosphorus Bridge; Dubai / Burj Khalifa; Mumbai / Gateway of India; Bangkok / Wat Arun.
- city-atlas-4.webp: Beijing / Temple of Heaven; Tokyo / Tokyo Tower; New York / Statue of Liberty; Washington / US Capitol; Mexico City / Angel of Independence; Rio / Christ the Redeemer.
- city-atlas-5.webp: Buenos Aires / Obelisk; Sydney / Opera House; Singapore / Marina Bay Sands; Seoul / N Seoul Tower; Toronto / CN Tower; Athens / Parthenon.

Runtime assets are in src/images. src/render/cityWorld.js selects the appropriate tile and caches three 900×600 canvases. It also contains original procedural illustrations as a fallback. Landmarks never participate in collision detection.
