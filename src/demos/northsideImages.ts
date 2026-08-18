/* ============================================================
   demos/northsideImages — WHERE EACH PHOTOGRAPH ACTUALLY IS.

   GENERATED. Do not edit. `python tools/seed/fetch_images.py` takes
   the measurement and writes the pictures; `python tools/seed/emit.py`
   writes this file from it.

   WHAT PROBLEM THIS SOLVES. The catalogue's photographs are addresses
   on eleven manufacturers' web servers, and until now the app fetched
   every one of them, live, from whatever wifi it was standing on. Two
   of those hosts can never answer a browser at all. The rest can be
   slow, can be down, and are not ours: the module page's whole visual
   argument was rented from somebody else's uptime.

   So each one was fetched ONCE, here, downscaled to what this app can
   actually draw, and committed under `public/seed-images`. The app now
   paints from its own origin. No network, no cross-origin refusal, no
   waiting.

   WHAT IS NOT CHANGED, AND THIS IS THE POINT.

   The DATA still holds the manufacturer's address. `ImageRef.src` is
   the same string it always was, the row is byte-for-byte what it was,
   the export carries the address, and a frozen quote cites the same
   place. Only the DISPLAY resolves to a local copy — the identical
   split `imageSources.ts` already draws between what a record says and
   what a browser may paint. IMAGE_SPEC.md §5.2 refuses to hold bytes
   ON A ROW, and that refusal is intact: these bytes are a build
   artefact beside the app, not a value inside it.

   NOTHING IS SUBSTITUTED. A photograph that could not be fetched is
   listed in `ABSENT` with the measured reason and NOTHING ELSE — no
   stand-in, no other boat's picture, no filename dressed up as a
   caption. Those rows keep saying "Held as a link", which is true.
   IMAGE_SPEC.md §6.6, §6.10.

   THERE IS A THIRD STATE, AND IT IS NAMED RATHER THAN ROUNDED AWAY.
   `NORTHSIDE_PICTURES.unmeasured` is how many of the seed's addresses
   this measurement has never been taken for. It is not zero: the
   catalogue grew to full scale (SEED_AT_FULL_SCALE.md §2.2) and taking
   a picture requires the network and somebody's decision to make a few
   hundred requests to nine third-party servers, which is not something
   a regeneration should do on its own. An unmeasured address behaves
   EXACTLY as an address whose fetch failed: the row keeps its address,
   the app draws "Held as a link", and nothing is invented. The count
   is here so the difference between "we asked and were refused" and
   "we have not asked" stays visible to whoever reads it next.

   Clear it with `python tools/seed/fetch_images.py`, which fetches only
   what is missing.
   ============================================================ */
import { registerSeededPictures } from '@/lib/imageSources'

/** address · the copy under `public/seed-images` · the ORIGINAL's natural
 *  pixel size, which is what a person means by how big the photograph is
 *  and what the enlarged plate prints. The copy's own size is in
 *  tools/seed/extracts/images.json with the rest of the provenance.
 *
 *  A tuple rather than an object: this list rides in the entry chunk, and
 *  four key names spelt out once per picture is 3 KB of nothing.
 *
 *  EXPORTED FOR ONE READER: northsideImages.test.ts, which checks every
 *  name here against what is really in public/seed-images. Nothing that
 *  SHIPS may read it — the one door is `registerNorthsidePictures`, or
 *  two surfaces resolve the same address differently. */
export const HELD: ReadonlyArray<readonly [string, string, number, number]> = [
  ["https://adventure.highfieldboats.com/wp-content/uploads/2025/01/ADV7%E9%BB%91%E8%89%B2%E6%B5%AE%E7%AD%92%E7%82%AD%E9%BB%91%E5%9E%AB%E5%AD%90%E5%89%8D%E8%A7%86%E5%9B%BE-2560x1440.jpg", "adv7-2560x1440-5b3ddb68.webp", 2560, 1440],
  ["https://adventure.highfieldboats.com/wp-content/uploads/2025/01/ADV7%E9%BB%91%E8%89%B2%E6%B5%AE%E7%AD%92%E7%99%BD%E8%89%B2%E5%9E%AB%E5%AD%90%E9%BB%91%E8%89%B2%E8%BE%B9%E5%89%8D%E8%A7%86%E5%9B%BE-2560x1440.jpg", "adv7-2560x1440-06b0b1a2.webp", 2560, 1440],
  ["https://adventure.highfieldboats.com/wp-content/uploads/2025/01/ADV7%E9%BB%91%E8%89%B2%E6%B5%AE%E7%AD%92%E8%93%9D%E8%89%B2%E5%9E%AB%E5%AD%90%E5%89%8D%E8%A7%86%E5%9B%BE-2560x1440.jpg", "adv7-2560x1440-723f10af.webp", 2560, 1440],
  ["https://app.jeanneau.com/uploads/media/image/exterior/hd/44a44ab277a303eeac7c81cdc23f2d64.jpg", "44a44ab277a303eeac7c81cdc23f2d64-5a79d47c.webp", 1920, 1280],
  ["https://app.jeanneau.com/uploads/media/image/exterior/hd/671fa70ffc0b86cb4c9e9258531b72be.jpg", "671fa70ffc0b86cb4c9e9258531b72be-1785ba4b.webp", 1920, 1439],
  ["https://app.jeanneau.com/uploads/media/image/exterior/hd/9297bd9a513917d5ff8de093eb133679.jpg", "9297bd9a513917d5ff8de093eb133679-0a098efc.webp", 1920, 1280],
  ["https://app.jeanneau.com/uploads/media/image/exterior/hd/caa40b62eb7349a8c8d2fbfd06c88a2e.jpg", "caa40b62eb7349a8c8d2fbfd06c88a2e-83618b4e.webp", 1920, 1280],
  ["https://dunbier.com/wp-content/uploads/2019/02/LP5.0M.jpg", "lp5-0m-d942533e.webp", 2501, 1463],
  ["https://dunbier.com/wp-content/uploads/2019/10/Sports-4.3-scaled.jpg", "sports-4-3-scaled-e04596aa.webp", 2560, 1517],
  ["https://mayfairmarine.com.au/images/2025/02/20/redco-tinka-logos-01.png", "redco-tinka-logos-01-8c653700.webp", 1000, 635],
  ["https://mayfairmarine.com.au/images/2025/04/16/ta600t-mob.jpg", "ta600t-mob-993510c6.webp", 1500, 632],
  ["https://mayfairmarine.com.au/images/2025/05/19/rs480-mo.jpg", "rs480-mo-4dc95d44.webp", 1631, 553],
  ["https://mayfairmarine.com.au/images/trailers/RE1213.jpg", "re1213-902f6470.webp", 1500, 514],
  ["https://mayfairmarine.com.au/images/trailers/RE1313.jpg", "re1313-a388e299.webp", 1500, 548],
  ["https://mayfairmarine.com.au/images/trailers/RS650-TMO.jpg", "rs650-tmo-0865106c.webp", 1850, 1093],
  ["https://mayfairmarine.com.au/images/trailers/RSX500.jpg", "rsx500-33290714.webp", 932, 555],
  ["https://mayfairmarine.com.au/images/trailers/TA700.jpg", "ta700-9cd9a5ef.webp", 1673, 634],
  ["https://mayfairmarine.com.au/images/trailers/re1313mo.jpg", "re1313mo-cceaa52b.webp", 1800, 838],
  ["https://mayfairmarine.com.au/images/trailers/ta480-mob.jpg", "ta480-mob-d06037ff.webp", 1800, 716],
  ["https://mayfairmarine.com.au/images/trailers/ta500-mob-02.jpg", "ta500-mob-02-21846f74.webp", 1500, 620],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/SRT-Side-Console-6.webp", "srt-side-console-6-4b0f17a5.webp", 1920, 1331],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/SRT-Side-Console-7.webp", "srt-side-console-7-a4a257bb.webp", 1920, 1080],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/bowrider-2.webp", "bowrider-2-2860dafe.webp", 1920, 1328],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/bowrider-3.webp", "bowrider-3-155b87f4.webp", 1920, 1291],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-centre-cabin-1.webp", "formosa-centre-cabin-1-4b56a989.webp", 1920, 1440],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-centre-cabin-2.webp", "formosa-centre-cabin-2-997a2231.webp", 1920, 1325],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-centre-cabin-3-1.webp", "formosa-centre-cabin-3-1-2eea0983.webp", 1920, 1280],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-grt-tiller-1-1024x539.jpg", "formosa-grt-tiller-1-1024x539-05202db9.webp", 1024, 539],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-srt-centre-console-2.webp", "formosa-srt-centre-console-2-12b25b52.webp", 1920, 1080],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-srt-centre-console-3.webp", "formosa-srt-centre-console-3-45e9ccc7.webp", 1920, 1080],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-srt-centre-console-6.webp", "formosa-srt-centre-console-6-01af1ec8.webp", 1920, 1080],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-territory-2.webp", "formosa-territory-2-dd24a476.webp", 1920, 1440],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2024/11/formosa-territory-3-1.webp", "formosa-territory-3-1-e2b39f6b.webp", 1920, 1440],
  ["https://www.formosamarineboats.com.au/wp-content/uploads/2026/02/GRT455_Stability-1024x768.jpg", "grt455-stability-1024x768-0698bd12.webp", 1024, 768],
  ["https://www.gfabtrailers.com.au/uploads/images/2022_Update/Medium_Boats/320X230/GFAB%20-%20Alloy%20Boat%20Trailer%20-Surtees%20700-LR-220812-7.jpg", "gfab-alloy-boat-trailer-surtees-700-lr-220812-7-64a43013.webp", 320, 230],
  ["https://www.gfabtrailers.com.au/uploads/images/2022_Update/Medium_Boats/320X230/GFAB-Alloy-Medium-Boat-Trailer-Stabicraft-2050SC.jpg", "gfab-alloy-medium-boat-trailer-stabicraft-2050sc-d7de2caa.webp", 320, 230],
  ["https://www.gfabtrailers.com.au/uploads/images/2022_Update/Small_Boats/500X300/GFAB-Alloy-Small-Boat-Trailer-Stabicraft-1550-Fisher-2.jpg", "gfab-alloy-small-boat-trailer-stabicraft-1550-fi-9165f2d3.webp", 500, 300],
  ["https://www.highfieldboats.com/wp-content/uploads/2019/04/PA420-DG-G-DG.jpg", "pa420-dg-g-dg-8947bedd.webp", 1920, 1079],
  ["https://www.highfieldboats.com/wp-content/uploads/2019/04/PA420-LG-W-DG-3.jpg", "pa420-lg-w-dg-3-5d3f71ac.webp", 1920, 1080],
  ["https://www.highfieldboats.com/wp-content/uploads/2019/05/CL260-LG-W.jpg", "cl260-lg-w-d8cb950a.webp", 1920, 1080],
  ["https://www.highfieldboats.com/wp-content/uploads/2019/05/CL260-W-W-1.jpg", "cl260-w-w-1-7d8b2b93.webp", 1920, 1080],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-B-B-B-1-2560x1440.jpg", "sp560-b-b-b-1-2560x1440-c5307ee7.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-B-B-DB-1-2560x1440.jpg", "sp560-b-b-db-1-2560x1440-afddb52a.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-B-W-C-1-2560x1440.jpg", "sp560-b-w-c-1-2560x1440-d2c03aab.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-DG-G-MB-1-2560x1440.jpg", "sp560-dg-g-mb-1-2560x1440-d5eab70d.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-I-B-B-1-1536x864.jpg", "sp560-i-b-b-1-1536x864-07df5089.webp", 1536, 864],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-LG-W-DB-1-2560x1440.jpg", "sp560-lg-w-db-1-2560x1440-59d973da.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-LG-W-WB-1-2560x1440.jpg", "sp560-lg-w-wb-1-2560x1440-df501c48.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2023/09/SP560-W-W-WB-4-2560x1440.jpg", "sp560-w-w-wb-4-2560x1440-c9afa06f.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2024/07/RU230KAMSTCLG2-2560x1440.jpg", "ru230kamstclg2-2560x1440-bf46e3da.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2024/07/RU230KAMSTCWH2-2560x1440.jpg", "ru230kamstcwh2-2560x1440-ea367bfa.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2024/08/PA540CS-B-B-DB-2-2560x1440.jpg", "pa540cs-b-b-db-2-2560x1440-8ea349f4.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2024/08/PA540CS-DG-G-DB2-2560x1440.jpg", "pa540cs-dg-g-db2-2560x1440-8e16e39d.webp", 2560, 1440],
  ["https://www.highfieldboats.com/wp-content/uploads/2024/08/PA540CS-LG-W-DG-2-1024x576.jpg", "pa540cs-lg-w-dg-2-1024x576-1fe75356.webp", 1024, 576],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2011/Open%20Boats/319%20Seasprite/319%20Seasprite%20(4)%20copy.jpg", "319-seasprite-4-copy-656bd47a.webp", 534, 282],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/499%20Sea%20Ranger%20Lifestyle%20(1).jpg", "499-sea-ranger-lifestyle-1-7d44842e.webp", 3000, 2000],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/589%20Ocean%20Ranger%20CC%20Lifestyle%20(2).jpg", "589-ocean-ranger-cc-lifestyle-2-5a7d0a94.webp", 3000, 2000],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/609%20Ocean%20Ranger%20Jpeg%20%20(1).jpg", "609-ocean-ranger-jpeg-1-6ea2baf9.webp", 2000, 1334],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TA1098S13sB-Package.jpg", "ta1098s13sb-package-5713be6a.webp", 635, 335],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TA1100S13SB-PKG.jpg", "ta1100s13sb-pkg-931c7140.webp", 635, 335],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TA1298S13SB-Package.jpg", "ta1298s13sb-package-533d5a1b.webp", 635, 335],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TA1400S13SB-Package.jpg", "ta1400s13sb-package-04af7da0.webp", 635, 335],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TA2000T13SB-Pacakge.jpg", "ta2000t13sb-pacakge-0636682f.webp", 635, 335],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TA749S13S-Package.jpg", "ta749s13s-package-883f4e59.webp", 635, 335],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TALL749S13.jpg", "tall749s13-bc081fa3.webp", 610, 320],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2020/Stacer/TALS749S13.jpg", "tals749s13-60226753.webp", 610, 320],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2021/Rampage/429/429%20Rampage%203.jpg", "429-rampage-3-2b99e5c6.webp", 2048, 969],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2023/Open%20Boats/Skimma/309/309%20Skimma%20Jpeg%20(1).jpg", "309-skimma-jpeg-1-aabbdc3e.webp", 1500, 998],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2023/Open%20Boats/Skimma/319/319%20Skimma%20Lifestyle.jpg", "319-skimma-lifestyle-59659f1e.webp", 700, 369],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2023/Open%20Boats/Territory%20Striker/359/359%20Territory%20Striker%20Lifestyle%20(1).jpg", "359-territory-striker-lifestyle-1-d2e8a3bd.webp", 1200, 800],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2023/Open%20Boats/Territory%20Striker/359/359%20Territory%20Striker%20Lifestyle%20(2).jpg", "359-territory-striker-lifestyle-2-fa15c6fa.webp", 1200, 796],
  ["https://www.surteesboats.com/_next/image?url=https%3A%2F%2Fwww.cms.surteesboats.com%2Fwp-content%2Fuploads%2F2024%2F12%2F770-GFBF-GM.png&w=1080&q=75", "image-a74e6bdf.webp", 1080, 588],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/inline-4-cylinder/2017/f115/overview-panel/f115-grey--white-800-x-600.ashx", "f115-grey-white-800-x-600-15788967.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/inline-4-cylinder/2017/f130/overview-panel/overview-f130-angle-800-x-600.ashx", "overview-f130-angle-800-x-600-4470fb7a.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/inline-4-cylinder/2023/f150xsa/profile/yamaha-f150-profile-800-x-600px-grey.ashx", "yamaha-f150-profile-800-x-600px-grey-9d6ec17d.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/inline-4-cylinder/2023/f150xsa/profile/yamaha-f150-profile-800-x-600px-white.ashx", "yamaha-f150-profile-800-x-600px-white-d99b5e51.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/inline-4-cylinder/2023/f175xcb/profile/yamaha-f175-profile-800-x-600px-grey.ashx", "yamaha-f175-profile-800-x-600px-grey-89230fee.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/inline-4-cylinder/2023/f200xsa/profile/yamaha-f200-profile-800-x-600px-grey.ashx", "yamaha-f200-profile-800-x-600px-grey-b75b8b94.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/inline-4-cylinder/2023/f200xsa/profile/yamaha-f200-profile-800-x-600px-white.ashx", "yamaha-f200-profile-800-x-600px-white-301fcae7.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2021/f225/profile/f225xcb-new-product-profile-800x600png.ashx", "f225xcb-new-product-profile-800x600png-6a4694e7.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2021/f250-des/profile/f250xsb-right-product-profile-800x600.ashx", "f250xsb-right-product-profile-800x600-172a0075.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2021/f250-des/profile/f250xsb2-f250xsb-product-profile-800x600.ashx", "f250xsb2-f250xsb-product-profile-800x600-fa1c6f6f.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2021/f250/profile/f250xcb-product-profile-800x600.ashx", "f250xcb-product-profile-800x600-478d9b53.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2021/f300-des/profile/f300xsb-right-product-profile-800x600.ashx", "f300xsb-right-product-profile-800x600-b5dae06b.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2021/f300-des/profile/f300xsb2-f300xsb-product-profile-800x600.ashx", "f300xsb2-f300xsb-product-profile-800x600-b153a141.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2021/f300/profile/f300xcb-product-profile-800x600.ashx", "f300xcb-product-profile-800x600-9536a896.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2023/xf450a/profile/yamaha-f450-profile-800-x-600px-white.ashx", "yamaha-f450-profile-800-x-600px-white-e471541c.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2024/f350/profile-pics/f300xsa-product-profile-800x600.ashx", "f300xsa-product-profile-800x600-11463aec.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2024/f350/profile-pics/f300xsa2-f300xsa-product-profile-800x600.ashx", "f300xsa2-f300xsa-product-profile-800x600-ac71a12b.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-thrust-four-stroke/ft25/overview-panel/ft25_p.ashx", "ft25-p-61d6ef2a.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-thrust-four-stroke/t60/overview-panel/2025/yamaha-ft60h-product-colour-800-x-600.ashx", "yamaha-ft60h-product-colour-800-x-600-16373c32.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f30/overview-panel/f30_800x600.ashx", "f30-800x600-a7175786.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f40la/overview-panel/f40_800x600.ashx", "f40-800x600-19336d92.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f50/overview-panel/2025/yamaha-f50c-grey-product-colour-800-x-600.ashx", "yamaha-f50c-grey-product-colour-800-x-600-5314bb0e.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f50/overview-panel/2025/yamaha-f50c-white-product-colour-800-x-600.ashx", "yamaha-f50c-white-product-colour-800-x-600-df028077.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f60lb/overview-panel/2025/yamaha-f60c-product-colour-800-x-600.ashx", "yamaha-f60c-product-colour-800-x-600-2507b09b.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f70la/overview-panel/2025/yamaha-f70b-grey-product-colour-800-x-600.ashx", "yamaha-f70b-grey-product-colour-800-x-600-335a19db.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f70la/overview-panel/2025/yamaha-f70b-white-product-colour-800-x-600.ashx", "yamaha-f70b-white-product-colour-800-x-600-eae7082a.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f75lb/overview-panel/f75-800-x-600.ashx", "f75-800-x-600-919744c2.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f90lb/overview-panel/f90-product-colour-800-x-600-new.ashx", "f90-product-colour-800-x-600-new-14ea290c.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/mid-range-four-stroke-30---90hp/2017/f90lb/overview-panel/f90-product-colour-grey-800-x-600.ashx", "f90-product-colour-grey-800-x-600-e5d35256.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/portable-four-stroke-25---25hp/2017/f15/overview-panel/f15-outboard-800-x-600.ashx", "f15-outboard-800-x-600-bad103f3.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/portable-four-stroke-25---25hp/2017/f2-5b/overview-panel/f25-outboard-800-x-600.ashx", "f25-outboard-800-x-600-e949c002.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/portable-four-stroke-25---25hp/2017/f20behpl/overview-panel/f20techspecs.ashx", "f20techspecs-6a7a9751.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/portable-four-stroke-25---25hp/2017/f25smhc/technical-specifications-panel/yamaha-f25-tiller-technical-specifications-panel-800x600.ashx", "yamaha-f25-tiller-technical-specifications-panel-f31f97c8.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/portable-four-stroke-25---25hp/2017/f4-f5-f6/overview-panel/f4-f5-f6-outboard-800-x-600.ashx", "f4-f5-f6-outboard-800-x-600-35c274fa.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/portable-four-stroke-25---25hp/2017/f8/overview-panel/f8-outboard-800-x-600.ashx", "f8-outboard-800-x-600-c43d0f37.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/portable-four-stroke-25---25hp/2017/f9-9/overview-panel/f99-outboard-800-x-600.ashx", "f99-outboard-800-x-600-e1c89aad.webp", 800, 600],
]

/** A HOST THAT ANSWERED NOTHING AT ALL, and why. Written once for the
 *  host rather than once per address: 71 of the 76 addresses below share
 *  one sentence, and that sentence is about the site. */
export const ABSENT_HOSTS: ReadonlyArray<readonly [string, string]> = [
  ["northsidemarine1.sharepoint.com", "northsidemarine1.sharepoint.com needs a sign-in to read"],
  ["www.northsidemarine.com.au", "northsidemarine.com.au serves its pictures to its own site only"],
]

/** One address that could not be taken on a host that otherwise serves —
 *  so the host is not the reason and cannot carry the sentence. A dead
 *  file on a healthy site: the fix is a corrected address in the
 *  workbook, which is the business's and not ours (IMAGE_SPEC.md §1.7). */
export const ABSENT: ReadonlyArray<readonly [string, string]> = [
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2024/609%20Ocean%20Ranger/609OceanRanger_PKG_2024.jpg", "stacer.com.au no longer has that picture"],
]

/** Copies taken, addresses measured and found unavailable, and the bytes
 *  those copies weigh — counted from the manifest rather than typed, so a
 *  re-fetch cannot leave a stale number behind. */
export const NORTHSIDE_PICTURES = {
  held: HELD.length,
  absent: 76,
  /** Addresses in the seed with NO answer of any kind — no copy, no
   *  measured refusal, and not on a host already recorded as serving
   *  nothing. They draw as "Held as a link", exactly like a refused
   *  one; the difference is that nobody has asked yet. Clear it with
   *  `python tools/seed/fetch_images.py`. */
  unmeasured: 234,
  bytes: 3525146,
  measured: "2026-08-18",
} as const

/** Hand the engine what shipped. Called once, from `@/demos`, which the
 *  shell imports — so the answer is in place before the first thumbnail
 *  asks for it, whether the sheet was just seeded or restored from a
 *  previous session. */
export function registerNorthsidePictures(): void {
  registerSeededPictures(HELD, ABSENT_HOSTS, ABSENT)
}
