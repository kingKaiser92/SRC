# Graph Report - SRC  (2026-09-03)

## Corpus Check
- Large corpus: 30 files · ~994,000 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 330 nodes · 501 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 83% EXTRACTED · 16% INFERRED · 2% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.84)
- Token cost: 391,082 input · 15,000 output

## Community Hubs (Navigation)
- Singlet Fit & Order Builder
- App Privacy & Strava Data Policy
- Order Backend & RSVP Submission
- Landing Page Scroll & Video
- Preorder Plan & Page Architecture
- Strava Support & RSVP Reveal
- Archive Carousel & Shop Modal
- Payment Panel & Copy Helpers
- Merch Product Line Design
- Singlet Artwork & Brand Marks
- Winged-Foot Brand Identity
- Support Page Cross-Linking
- Strava Trademark Terms
- WCAG Contrast Tokens

## God Nodes (most connected - your core abstractions)
1. `Privacy Policy` - 15 edges
2. `Form submit handler` - 14 edges
3. `Strava Support Page` - 11 edges
4. `Support Page` - 11 edges
5. `renderOrder()` - 11 edges
6. `doPost(e) Preorder Handler` - 11 edges
7. `Saints Run Club Landing Page` - 10 edges
8. `Shop / Merch Page` - 10 edges
9. `Terms of Service` - 10 edges
10. `strava.html Dedicated Support Page` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Honeypot company field` --semantically_similar_to--> `public.singlet_preorders table and RLS policy`  [INFERRED] [semantically similar]
  preorder.html → PREORDER-SETUP.md
- `Boomerang Video Playback` --semantically_similar_to--> `Cinematic Intro Handoff (video to flying title)`  [INFERRED] [semantically similar]
  index.html → shop.html
- `weeklyObserver (IntersectionObserver)` --semantically_similar_to--> `triggerStaggerAnimations`  [INFERRED] [semantically similar]
  index.html → shop.html
- `events (archive event data array)` --semantically_similar_to--> `productData (product catalog object)`  [INFERRED] [semantically similar]
  index.html → shop.html
- `initGallery` --semantically_similar_to--> `openProduct`  [INFERRED] [semantically similar]
  index.html → shop.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shop Intro Cinematic Sequence** — shop_videointro, shop_startvideofade, shop_dismissintro, shop_showflyingtitle, shop_flytitletoposition, shop_triggerstaggeranimations [EXTRACTED 1.00]
- **Events Archive Carousel Flow** — index_events, index_initgallery, index_selectitem, index_updategallerystate, index_activecarouselindex, index_keydownhandler [EXTRACTED 1.00]
- **Strava Integration Policy Surface** — strava_readonlyaccess, strava_servertokenstorage, strava_disconnectflow, privacy_stravadata, terms_thirdpartyservices, support_stravafaq [INFERRED 0.85]
- **Singlet preorder checkout flow** — preorder_cut_chips, preorder_size_chips, preorder_quantity_stepper, preorder_addline, preorder_copy_memo_button, preorder_submit_handler, preorder_receipt [INFERRED 0.90]
- **CONFIG.endpoint as the single capture condition** — preorder_config, preorder_receipt, preorder_submit_handler, docs_superpowers_specs_2026_09_01_singlet_preorder_page_design_unwired_capture_decision, preorder_setup_route_a_google_apps_script [INFERRED 0.90]
- **Deadline hard-close mechanism** — preorder_isclosed, preorder_tickcountdown, preorder_applyclosed, preorder_submit_handler, docs_superpowers_specs_2026_09_01_singlet_preorder_page_design_hard_close [INFERRED 0.85]
- **End-to-End RSVP Submission Flow** — rsvp_submitbtn, rsvp_submit, rsvp_form_validation, rsvp_savesubmission, rsvp_rsvp_endpoint, rsvp_setup_dopost, rsvp_setup_google_sheet, rsvp_setup_mailapp_notification [EXTRACTED 1.00]
- **Singlet Preorder Capture Flow** — google_apps_script_dopost, google_apps_script_honeypot, google_apps_script_server_side_deadline, google_apps_script_script_lock, google_apps_script_sheet_name, google_apps_script_headers, google_apps_script_json [EXTRACTED 1.00]
- **Strava Brand & API Review Compliance** — docs_superpowers_specs_2026_08_19_strava_support_page_design_strava_html, strava_assets_readme_powered_by_strava_svg, strava_assets_readme_official_asset_requirement, strava_assets_readme_onerror_fallback, docs_superpowers_specs_2026_08_19_strava_support_page_design_trademark_disclaimer, docs_superpowers_specs_2026_08_19_strava_support_page_design_strava_orange_token [EXTRACTED 1.00]
- **SRC Member Merch Line (Shop Catalogue)** — products_src_hoodie_hoodie, products_src_singlet_member_singlet, products_src_socks_member_socks, products_src_windbreaker_member_windbreaker, products_src_socks_member_naming_convention [INFERRED 0.85]
- **SRC Brand System: Winged Shoe, Black/Gold, Collegiate Type** — products_src_hoodie_winged_shoe_lockup, products_src_hoodie_black_gold_colorway, products_src_hoodie_condensed_collegiate_type, products_src_hoodie_src_chest_monogram, products_src_singlet_tonal_neck_mark [EXTRACTED 1.00]
- **Shared Flat-Lay Catalogue Shot Language** — products_src_hoodie_hoodie, products_src_singlet_member_singlet, products_src_socks_member_socks, products_src_windbreaker_member_windbreaker, products_src_windbreaker_flat_lay_studio_photography [EXTRACTED 1.00]
- **Singlet Visual Identity (Navy Body, Gold Graphics, Front and Back)** — singlet_assets_singlet_front_render, singlet_assets_singlet_back_render, singlet_assets_singlet_front_star_burst_mark, singlet_assets_singlet_front_saints_run_club_wordmark, singlet_assets_singlet_back_built_for_takeoff_slogan, singlet_assets_src_mark_navy_and_gold_palette [EXTRACTED 1.00]
- **SRC Brand Mark Variant Set** — singlet_assets_src_mark_brand_mark, singlet_assets_src_mark_dark_brand_mark, singlet_assets_src_mark_two_variant_system, singlet_assets_src_mark_navy_and_gold_palette [EXTRACTED 1.00]
- **Preorder Page Asset Bundle** — singlet_assets_singlet_front_render, singlet_assets_singlet_back_render, singlet_assets_src_mark_brand_mark, singlet_assets_src_mark_dark_brand_mark, singlet_assets_zelle_qr_payment_code [INFERRED 0.85]
- **SRC Winged-Foot Brand System** — og_image_share_card, rsvp_assets_winged_foot_site_logo_mark, og_image_winged_foot_emblem, og_image_src_wordmark, og_image_src_brand_identity [INFERRED 0.85]
- **Share Card Composition** — og_image_share_card, og_image_centered_lockup_layout, og_image_black_gold_palette, og_image_link_preview_role [EXTRACTED 1.00]
- **Self-Hosted Run-Footage Video Set** — astoria_park_track_video, saturday_long_run_video, nyc_drop_in_video, src_self_hosted_video_assets [EXTRACTED 1.00]

## Communities (14 total, 3 thin omitted)

### Community 0 - "Singlet Fit & Order Builder"
Cohesion: 0.07
Nodes (45): Task 3: Update the page, Hard close at the deadline, Honeypot spam gap closed, Race Day Singlet Preorder Page Design, Client-side validation order, Cut carried in the Item column, Cut chip group UI, No default cut selection (+37 more)

### Community 1 - "App Privacy & Strava Data Policy"
Cohesion: 0.08
Nodes (42): Anonymous-by-Default Account, Children's Privacy (under 13), Account & Data Deletion, Expo (push delivery, app updates), Timestamp-Only Location Check-In, No Tracking or Advertising Policy, Privacy Policy, Public vs Private Profile Fields (+34 more)

### Community 2 - "Order Backend & RSVP Submission"
Cohesion: 0.06
Nodes (41): CLOSES_AT Preorder Deadline, doGet() Health Check, doPost(e) Preorder Handler, Singlet Preorder Apps Script Endpoint, HEADERS Order Row Schema, Honeypot Bot Filter (d.company), json() ContentService Responder, lineIndex First-Line Email Dedupe (+33 more)

### Community 3 - "Landing Page Scroll & Video"
Cohesion: 0.09
Nodes (38): Astoria Park Track Video (Wednesday speed session b-roll), Saints Run Club App Store Listing, Boomerang Video Playback, Sticky Card-Stack Scroll Pattern, Fixed Social Header Nav, @svintsrunclub Instagram, longrun-video (Saturday long run video), onScroll (+30 more)

### Community 4 - "Preorder Plan & Page Architecture"
Cohesion: 0.07
Nodes (34): Plan global constraints, No breakpoint media queries rule, No scroll listener rule, overflow-x clip not hidden rule, Singlet Preorder Page Implementation Plan, Task 1: Build the compressed GLB, Task 2: Merge the viewer, Task 4: Ship the backend, ready but not deployed (+26 more)

### Community 5 - "Strava Support & RSVP Reveal"
Cohesion: 0.08
Nodes (30): Contact Card Above the Fold, Shared CSS Token Block, What Saints Run Club Accesses (Read-Only), Disconnecting Strava (In-App and strava.com/settings/apps), privacy.html Strava Section, _redirects /strava → /strava.html Rule, Strava Support Page Design Spec, strava.html Dedicated Support Page (+22 more)

### Community 6 - "Archive Carousel & Shop Modal"
Cohesion: 0.11
Nodes (28): activeCarouselIndex (carousel state), events (archive event data array), 3D Flip Card Carousel Spine, gallery-controls indicator dots, gallery-track container, Mobile Hero Details Auto-Collapse, initGallery, Archive keydown arrow handler (+20 more)

### Community 7 - "Payment Panel & Copy Helpers"
Cohesion: 0.13
Nodes (19): Copy that must change for two cuts, bindCopy(), Copy Zelle handle button (#copy-handle), Copy memo button (#copy-memo), Product detail spec strip, Email input (#f-email), fallbackCopy(), lineLabel() (+11 more)

### Community 8 - "Merch Product Line Design"
Cohesion: 0.24
Nodes (18): Oversized Back-Hit Logo Placement, Black and Gold-Yellow Colorway, Condensed Bold Collegiate Wordmark Type, SRC Hoodie (Black Pullover), SRC Chest Monogram, Winged Running Shoe Logo Lockup, Yellow Hem Product-Name Callout, Member Singlet (Black Mesh Racerback) (+10 more)

### Community 9 - "Singlet Artwork & Brand Marks"
Cohesion: 0.27
Nodes (14): BUILT FOR TAKEOFF Vertical Spine Slogan, Singlet Back Render, Condensed Bold Athletic Typography, Flight and Takeoff Motif, Small Dark Swoosh Mark on Left Chest, Singlet Front Render, SAINTS RUN CLUB Chest Wordmark, Gold Four-Point Star Burst Mark (+6 more)

### Community 10 - "Winged-Foot Brand Identity"
Cohesion: 0.29
Nodes (12): Black and Gold Palette, Centered Logo Lockup Layout, Social Link Preview Role, Absent Tagline or Club Name Text, SRC Open Graph Share Card, Saints Run Club Brand Identity, SRC Yellow Wordmark, Winged Foot Emblem (+4 more)

## Ambiguous Edges - Review These
- `Saints Run Club Landing Page` → `Shop / Merch Page`  [AMBIGUOUS]
  index.html · relation: references
- `Saints Run Club App Store Listing` → `Stripe Payment Link Checkout`  [AMBIGUOUS]
  shop.html · relation: conceptually_related_to
- `productData (product catalog object)` → `Stripe Payment Link Checkout`  [AMBIGUOUS]
  shop.html · relation: references
- `saveSubmission()` → `doPost(e) Preorder Handler`  [AMBIGUOUS]
  rsvp.html · relation: references
- `SRC Hoodie (Black Pullover)` → `"MEMBER" Product Naming Convention`  [AMBIGUOUS]
  Products/src-hoodie.png · relation: conceptually_related_to
- `Gold Four-Point Star Burst Mark` → `SRC Winged-Foot Brand Mark (Light Variant)`  [AMBIGUOUS]
  singlet-assets/singlet-front.png · relation: conceptually_related_to
- `Small Dark Swoosh Mark on Left Chest` → `SRC Winged-Foot Brand Mark (Light Variant)`  [AMBIGUOUS]
  singlet-assets/singlet-front.png · relation: conceptually_related_to
- `SRC Open Graph Share Card` → `Absent Tagline or Club Name Text`  [AMBIGUOUS]
  og-image.png · relation: conceptually_related_to
- `Winged Foot Logo Mark Asset` → `Winged Foot Venue Interpretation`  [AMBIGUOUS]
  rsvp-assets/winged-foot-site.png · relation: conceptually_related_to

## Knowledge Gaps
- **52 isolated node(s):** `Tailwind Theme Config (index)`, `Tailwind Theme Config (shop)`, `zoomImage`, `card-spotlight mouse-tracked border glow`, `Product image parallax tilt handler` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 78 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Saints Run Club Landing Page` and `Shop / Merch Page`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Saints Run Club App Store Listing` and `Stripe Payment Link Checkout`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `productData (product catalog object)` and `Stripe Payment Link Checkout`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `saveSubmission()` and `doPost(e) Preorder Handler`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SRC Hoodie (Black Pullover)` and `"MEMBER" Product Naming Convention`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Gold Four-Point Star Burst Mark` and `SRC Winged-Foot Brand Mark (Light Variant)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Small Dark Swoosh Mark on Left Chest` and `SRC Winged-Foot Brand Mark (Light Variant)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._