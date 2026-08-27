/* ============================================================
   demos/northsideImages — WHERE EACH PHOTOGRAPH ACTUALLY IS.

   GENERATED. Do not edit. `python tools/seed/fetch_images.py` takes
   the measurement and writes the pictures; `python tools/seed/emit.py`
   writes this file from it.

   WHAT PROBLEM THIS SOLVES. The catalogue's photographs are addresses
   on eleven manufacturers' web servers, and until now the app fetched
   every one of them, live, from whatever wifi it was standing on. Some
   of those hosts can never answer a browser at all. The rest can be
   slow, can be down, and are not ours: the module page's whole visual
   argument was rented from somebody else's uptime.

   So each one was fetched ONCE, here, downscaled to what this app can
   actually draw, and committed under `public/seed-images`. The app now
   paints from its own origin. No network, no cross-origin refusal, no
   waiting.

   WHERE THE HARD ONES CAME FROM, AND WHY IT IS NOT A GUESS.
   `www.northsidemarine.com.au` answers Cloudflare's challenge to us and
   to a browser alike, so 71 addresses could not be taken from it at all.
   The dealership had already hit that same wall and already solved it:
   its own remediation run copied every picture it recovered into its
   Storage bucket under a name computed from THE ORIGINAL ADDRESS —
   `mpf-mirror/{folder}/{sha1(url)[:16]}.{ext}`
   (`HelmLogic/scripts/mpf/remediate-images.py:170,180`). So the copy of
   a given row's photograph can be ASKED FOR BY NAME, arithmetically,
   from the address the workbook typed for that row. Nothing is searched
   for, nothing is matched by resemblance, and a wrong photograph cannot
   arrive by that path. Each one also had to agree with the pixel size
   its own address declares before it was allowed to land. Which
   addresses came that way is in `tools/seed/extracts/images.json` under
   `via: mpf-mirror`, with the object name and the key beside it.

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
   IMAGE_SPEC.md §6.6, §6.10. That is still what six of these addresses
   do, and it is the right answer for them: four are behind an M365
   sign-in, one is a dead file on a healthy site, and one is the single
   Northside address the dealership's own recovery never reached either.

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
  ["https://www.northsidemarine.com.au/haines-signature-boats/wp-content/uploads/sites/11/2023/05/620F-1024x683.jpg", "620f-1024x683-4dd22900.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/haines-signature-boats/wp-content/uploads/sites/11/2023/05/680F-edit-01-1024x683.jpg", "680f-edit-01-1024x683-ef33534d.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/haines-signature-boats/wp-content/uploads/sites/11/2023/05/IMG_4356-copy-1024x683.jpg", "img-4356-copy-1024x683-c512d459.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/haines-signature-boats/wp-content/uploads/sites/11/2023/05/IMG_4520-1024x683.jpg", "img-4520-1024x683-cf2f2b2b.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/haines-signature-boats/wp-content/uploads/sites/11/2023/05/June-17th-640F-edt-11-1024x683.jpg", "june-17th-640f-edt-11-1024x683-9fefb8f6.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/haines-signature-boats/wp-content/uploads/sites/11/2023/06/535BR_EILDON_15-6-of-9-1024x683.jpg", "535br-eildon-15-6-of-9-1024x683-3fbb1688.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/haines-signature-boats/wp-content/uploads/sites/11/2023/09/Fisher_620BRX_N012257-7-1024x681.jpg", "fisher-620brx-n012257-7-1024x681-da4f3ef0.webp", 1024, 681],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2020/01/Merry-Fisher-795-Sport-Series-2-1024x495.jpg", "merry-fisher-795-sport-series-2-1024x495-009cf385.webp", 1024, 495],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2020/01/c451753b9221a472f849164efab496e2-1024x683.jpg", "c451753b9221a472f849164efab496e2-1024x683-1beb507e.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2020/02/511724270f0cbb55154c46299a062f74-1024x683.jpg", "511724270f0cbb55154c46299a062f74-1024x683-a2ca9934.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2020/02/8c871013715b6fa5de9aa2a0745a1267-1024x683.jpg", "8c871013715b6fa5de9aa2a0745a1267-1024x683-473e7aad.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2020/02/a235a869559bfc3b828f217631eaceea-1024x683.jpg", "a235a869559bfc3b828f217631eaceea-1024x683-5a024ea0.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2020/02/abd1bc7b8afb1eb9a2474ebae75dd48a-1024x683.jpg", "abd1bc7b8afb1eb9a2474ebae75dd48a-1024x683-a37cc5de.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2020/02/e09d08648e524bda54baff30add8db63-1024x683.jpg", "e09d08648e524bda54baff30add8db63-1024x683-0c567775.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2022/03/631225f4d5884717378137-1024x683.jpeg", "631225f4d5884717378137-1024x683-1a26092a.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2022/09/Cap-Camarat-5.5-CC-4-1024x683.jpeg", "cap-camarat-5-5-cc-4-1024x683-cfa1dc8a.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2022/09/MF-1095-S2-1024x683.jpg", "mf-1095-s2-1024x683-e78cee63.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2022/09/Merry_Fisher_1295_Fly-Julien_Gazeau-1420-800px.jpg", "merry-fisher-1295-fly-julien-gazeau-1420-800px-19dd40e6.webp", 800, 532],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2022/09/Merry_Fisher_605-Jerome_KELAGOPIAN-5944-1024x683.jpg", "merry-fisher-605-jerome-kelagopian-5944-1024x683-f52273e9.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2022/10/d4af432bc7aef94319759bab129c3e1d-1024x576.jpg", "d4af432bc7aef94319759bab129c3e1d-1024x576-7ef30691.webp", 1024, 576],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2023/11/98e92e368cfd53dc31273a95237cc8ac.jpeg", "98e92e368cfd53dc31273a95237cc8ac-57f0a7bf.webp", 800, 533],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2023/12/Cap-Camarat-7.5-wa-serie3-23.jpeg", "cap-camarat-7-5-wa-serie3-23-36747139.webp", 800, 533],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2023/12/Cap-Camarat-7.5cc-serie3-5-1024x683.jpeg", "cap-camarat-7-5cc-serie3-5-1024x683-6edf4885.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2023/12/Cap-Camarat-9.0-WA-Serie2-7-1024x683.jpeg", "cap-camarat-9-0-wa-serie2-7-1024x683-1b2f11f6.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2024/08/Merry_Fisher_895_Sport_Serie2-37-1024x683.jpg", "merry-fisher-895-sport-serie2-37-1024x683-909e9780.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2024/09/MerryFisher1295coupe-22-1024x682.jpg", "merryfisher1295coupe-22-1024x682-5bc59ecf.webp", 1024, 682],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2025/01/N013475-Jeanneau-Merry-Fisher-795-S2-1-1024x683.jpeg", "n013475-jeanneau-merry-fisher-795-s2-1-1024x683-909104ea.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2025/07/Jeanneau-Merry-Fisher-1095-Coupe-Serie2-2-1024x683.png", "jeanneau-merry-fisher-1095-coupe-serie2-2-1024x6-9a4a2156.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/jeanneau-boats/wp-content/uploads/sites/5/2025/11/C002617_MerryFisher695_-1-1024x683.jpg", "c002617-merryfisher695-1-1024x683-77fd9918.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2022/12/1-12.png", "1-12-dabc9bb1.webp", 894, 597],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2023/01/1450FR-19.jpg", "1450fr-19-25bd4ebd.webp", 1200, 800],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2023/01/IMG_7808.jpg", "img-7808-646834b4.webp", 1200, 800],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2023/01/STABI1550F_Great_Barrier_035.jpg", "stabi1550f-great-barrier-035-a3c03f2c.webp", 1200, 800],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2023/01/Stabicraft-2050-Supercab-10-1024x686.png", "stabicraft-2050-supercab-10-1024x686-4e1e83c7.webp", 1024, 686],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2024/01/2050Treker-Brochure__FillWzExMjAsNzUwXQ-1-1024x686.jpg", "2050treker-brochure-fillwzexmjasnzuwxq-1-1024x68-0b1d640f.webp", 1024, 686],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2024/06/Stabicraft-2350-Supercab-15-1024x686.png", "stabicraft-2350-supercab-15-1024x686-27fd6077.webp", 1024, 686],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2024/12/Stabicraft_1450_Explorer_N012881-1-1024x683.jpg", "stabicraft-1450-explorer-n012881-1-1024x683-54d2a71a.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/01/Stabicraft-2750-Ultra-Centercab-25-1024x686.png", "stabicraft-2750-ultra-centercab-25-1024x686-bea24358.webp", 1024, 686],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/05/Stabicraft-2050-Frontier-1.jpeg", "stabicraft-2050-frontier-1-429b5994.webp", 1120, 750],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/05/Stabicraft-2350-Ultracab-WT-1024x575.png", "stabicraft-2350-ultracab-wt-1024x575-2da9d242.webp", 1024, 575],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/05/Stabicraft-Ultra-Centrecab-3-1024x686.jpeg", "stabicraft-ultra-centrecab-3-1024x686-9e25863d.webp", 1024, 686],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/07/N013458-Stabicraft-2350-Supercab-1-1024x683.jpg", "n013458-stabicraft-2350-supercab-1-1024x683-908f313f.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/07/N013460-Stabicraft-1450-Frontier-1-1024x683.jpeg", "n013460-stabicraft-1450-frontier-1-1024x683-978a906f.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/07/N013694-Stabicraft-2350-Ultra-Centrecab-1-1024x683.jpeg", "n013694-stabicraft-2350-ultra-centrecab-1-1024x6-3df755df.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/09/N013741-Stabicraft-1850-Supercab-1-1024x683.jpeg", "n013741-stabicraft-1850-supercab-1-1024x683-f970ae95.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stabicraft-boats/wp-content/uploads/sites/7/2025/11/N013781_2050_Frontier_-1-1024x683.jpg", "n013781-2050-frontier-1-1024x683-35bda5d5.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2020/04/359-proline.jpg", "359-proline-7988c97c.webp", 1365, 767],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2021/05/589-Sea-Runners.jpg", "589-sea-runners-9b1b6281.webp", 1920, 1280],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2022/03/DSC04142Jun-01-2022.jpg", "dsc04142jun-01-2022-639d28bf.webp", 2505, 1673],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/359-Proline-Banner-1.jpg", "359-proline-banner-1-72cb7f4e.webp", 1140, 550],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/379-Proline-1-1.jpg", "379-proline-1-1-915ab82d.webp", 994, 663],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/409-Proline-Angler-798x466-1.jpg", "409-proline-angler-798x466-1-bee482f4.webp", 798, 466],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/429-Proline-Angler-11-scaled.jpg", "429-proline-angler-11-scaled-8e60a221.webp", 2560, 1700],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/449ProlineAngler_PKG_2023-scaled.jpg", "449prolineangler-pkg-2023-scaled-e254819d.webp", 2560, 1701],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/469-Assault-Pro-Tiff-1-1-1024x674.jpg", "469-assault-pro-tiff-1-1-1024x674-a66c3809.webp", 1024, 674],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/519-Assault-Tiff-5.jpg", "519-assault-tiff-5-4e87cdce.webp", 1920, 1287],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/01/529-Assault-Lifestyle-Tiffs-7-1024x676.jpg", "529-assault-lifestyle-tiffs-7-1024x676-fbf66995.webp", 1024, 676],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/02/409-Assault-Pro-Tiff-3-1024x683.jpg", "409-assault-pro-tiff-3-1024x683-2c8a3943.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/02/429-Assault-Pro-Banner.jpg", "429-assault-pro-banner-eeb73e32.webp", 1140, 550],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/02/449AssaultPro_Internal_2024-3-1024x680.jpg", "449assaultpro-internal-2024-3-1024x680-a678e795.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/02/489-Assault-Pro-Banner-1024x494.jpg", "489-assault-pro-banner-1024x494-0f646b70.webp", 1024, 494],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/02/589SeaMaster_PKG_2022.jpg", "589seamaster-pkg-2022-bc834d37.webp", 1776, 1180],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/03/449SeaMaster_PKG_2022-1024x680.jpg", "449seamaster-pkg-2022-1024x680-72e498fc.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/03/481-SeaMaster-PKG-2023-1024x680.jpg", "481-seamaster-pkg-2023-1024x680-bb6c40bd.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/03/499-Sea-Master-scaled-1-1024x576.jpg", "499-sea-master-scaled-1-1024x576-24ae0f50.webp", 1024, 576],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/03/519SeaMaster_PKG_2022-1024x680.jpg", "519seamaster-pkg-2022-1024x680-c6916e5c.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/04/37.jpg", "37-26bbd596.webp", 1024, 592],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/04/539-Wild-Rider-798x466-1.jpg", "539-wild-rider-798x466-1-95918923.webp", 798, 466],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/04/619-Wild-Rider-798x466-2.jpg", "619-wild-rider-798x466-2-a09e2fdd.webp", 798, 466],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/05/429OutlawTS_PKG_2024-1024x680.jpg", "429outlawts-pkg-2024-1024x680-68730c6b.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/05/469-Outlaw-SC-1024x683.jpg", "469-outlaw-sc-1024x683-05deedb4.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/05/481-crossfire-sc-1.jpg", "481-crossfire-sc-1-7568ee6a.webp", 1771, 1183],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/05/489OutlawSC_PKG_2024-1024x680.jpg", "489outlawsc-pkg-2024-1024x680-33e22cc2.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/05/529-Outlaw-SC-3-1024x683.jpg", "529-outlaw-sc-3-1024x683-bc34dfb7.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2023/05/DSC03291.jpg", "dsc03291-e81b6be0.webp", 1771, 1183],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/03/429-Outlaw-Side-Console-11.jpg", "429-outlaw-side-console-11-0799407f.webp", 800, 600],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/429SeaMasterSE-2-1024x684.jpg", "429seamasterse-2-1024x684-b2ce9dba.webp", 1024, 684],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/449OutlawCC_PKG_2024-1024x680.jpg", "449outlawcc-pkg-2024-1024x680-91647405.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/459AssaultPro_PKG_2021-1-scaled.jpg", "459assaultpro-pkg-2021-1-scaled-fcae4c03.webp", 2560, 1310],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/469OutlawCC_PKG_2024-1024x680.jpg", "469outlawcc-pkg-2024-1024x680-d7750030.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/499-wild-rider-se-1024x684.jpg", "499-wild-rider-se-1024x684-3cf00d76.webp", 1024, 684],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/519WildRider_PKG_2022-1024x680.jpg", "519wildrider-pkg-2022-1024x680-6768814a.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/539-crossfire-rcc-2.jpg", "539-crossfire-rcc-2-4806588c.webp", 1771, 1183],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/539SeaMasterSE_PKG_2022-1024x680.jpg", "539seamasterse-pkg-2022-1024x680-8deba207.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/04/539SeaRunner_PKG_2022-1.jpg", "539searunner-pkg-2022-1-3eebe0dd.webp", 1776, 1180],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/07/449OutlawSC_PKG_2024-scaled.jpg", "449outlawsc-pkg-2024-scaled-44a26cee.webp", 2560, 1700],
  ["https://www.northsidemarine.com.au/stacer-boats/wp-content/uploads/sites/8/2024/07/529OutlawCC_PKG_2024-1024x680.jpg", "529outlawcc-pkg-2024-1024x680-190f1daa.webp", 1024, 680],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2020/01/20180919-120314-1024x512.jpg", "20180919-120314-1024x512-b7d03b18.webp", 1024, 512],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2020/01/Surtees-610-WMGT-26-1024x699.jpg", "surtees-610-wmgt-26-1024x699-00ef59b8.webp", 1024, 699],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2020/01/Surtees-Boats-650-Workmate-Australia-New-Zealand-Best-Trailer-Fishing-Boat3-1024x512.jpg", "surtees-boats-650-workmate-australia-new-zealand-973c2ecb.webp", 1024, 512],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2020/02/Surtees-610-Pro-Fisher-11-1024x683.jpg", "surtees-610-pro-fisher-11-1024x683-d4a165ea.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2022/08/S495-7-1024x512.jpg", "s495-7-1024x512-9be42ffe.webp", 1024, 512],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2022/12/1Surtees-Boats-700-Workmate-Hardtop-Australia-New-Zealand-Best-Trailer-Fishing-Boat--1024x473.jpg", "1surtees-boats-700-workmate-hardtop-australia-ne-794aabc0.webp", 1024, 473],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2022/12/Surtees-540-pro-fisher-4-1024x512.jpg", "surtees-540-pro-fisher-4-1024x512-4c72bfb6.webp", 1024, 512],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2022/12/Surtees-800-10-LR-1024x512.jpg", "surtees-800-10-lr-1024x512-70090378.webp", 1024, 512],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2022/12/Surtees-Boats-4.85-Centre-Console-1.jpg", "surtees-boats-4-85-centre-console-1-e7d1ccfb.webp", 720, 480],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2022/12/Surtees-Boats-650-Pro-Fisher-Australia-New-Zealand-Best-Trailer-Fishing-Boat-4.jpg", "surtees-boats-650-pro-fisher-australia-new-zeala-743e4253.webp", 720, 480],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2022/12/surtees-boats-575-pro-fisher-centre-console-GL1.jpg", "surtees-boats-575-pro-fisher-centre-console-gl1-8f438bf1.webp", 720, 480],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2023/10/WMHT-575-V2-m-15-1024x694.jpg", "wmht-575-v2-m-15-1024x694-2f0633c8.webp", 1024, 694],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2025/04/Surtees-620-Gamefisher-3-1024x768.jpeg", "surtees-620-gamefisher-3-1024x768-febd0cc8.webp", 1024, 768],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2025/04/Surtees-670-Game-Fisher-30-1024x781.jpeg", "surtees-670-game-fisher-30-1024x781-eb042104.webp", 1024, 781],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2025/06/N013442-Surtees-720-Game-Fisher-1-1024x683.jpeg", "n013442-surtees-720-game-fisher-1-1024x683-f1924516.webp", 1024, 683],
  ["https://www.northsidemarine.com.au/surtees-boats/wp-content/uploads/sites/6/2025/06/N013443-Surtees-770-Game-Fisher-1-1024x683.jpeg", "n013443-surtees-770-game-fisher-1-1024x683-c309af92.webp", 1024, 683],
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
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/high-performance-vmax-sho/2017/vf115la/overview-panel/yamaha-vmax-sho-overview-specifications-thumbnail-800-x-600-vf115.ashx", "yamaha-vmax-sho-overview-specifications-thumbnai-5a22fb7f.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/high-performance-vmax-sho/2017/vf150la/overview-panel/yamaha-vmax-sho-overview-specifications-thumbnail-800-x-600-vf150.ashx", "yamaha-vmax-sho-overview-specifications-thumbnai-6a053381.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/high-performance-vmax-sho/2017/vf175la/overview-panel/yamaha-vmax-sho-overview-specifications-thumbnail-800-x-600-vf175.ashx", "yamaha-vmax-sho-overview-specifications-thumbnai-aa8342f4.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/high-performance-vmax-sho/2017/vf200la/overview-panel/vf200-technical-specification-image-800-x-600.ashx", "vf200-technical-specification-image-800-x-600-d3d5e34a.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/high-performance-vmax-sho/2017/vf225la/overview-panel/vf225-technical-specification-image-800-x-600.ashx", "vf225-technical-specification-image-800-x-600-b948d1a2.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/high-performance-vmax-sho/2017/vf250la/overview-panel/vf250-technical-specification-image-800-x-600.ashx", "vf250-technical-specification-image-800-x-600-a4b638b4.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/high-performance-vmax-sho/2018/vf90la/overview-panel/yamaha-vmax-sho-overview-specifications-thumbnail-800-x-600-vf90.ashx", "yamaha-vmax-sho-overview-specifications-thumbnai-a43cfd6e.webp", 800, 600],
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
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2023/xf450a/profile/yamaha-f450-profile-800-x-600px-grey.ashx", "yamaha-f450-profile-800-x-600px-grey-d4a53d40.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2023/xf450a/profile/yamaha-f450-profile-800-x-600px-white.ashx", "yamaha-f450-profile-800-x-600px-white-e471541c.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2024/f350/profile-pics/f300xsa-product-profile-800x600.ashx", "f300xsa-product-profile-800x600-11463aec.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-horsepower-four-stroke-115---425hp/v6-and-v8/2024/f350/profile-pics/f300xsa2-f300xsa-product-profile-800x600.ashx", "f300xsa2-f300xsa-product-profile-800x600-ac71a12b.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-thrust-four-stroke/ft25/overview-panel/ft25_p.ashx", "ft25-p-61d6ef2a.webp", 800, 600],
  ["https://www.yamaha-motor.com.au/-/media/products/marine/outboard/high-thrust-four-stroke/ft99/overview-panel/ft99_800x600_3qtr_tech.ashx", "ft99-800x600-3qtr-tech-a4318a9b.webp", 800, 600],
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
 *  host rather than once per address: 4 of the 6 addresses
 *  below share one sentence, and that sentence is about the site. */
export const ABSENT_HOSTS: ReadonlyArray<readonly [string, string]> = [
  ["northsidemarine1.sharepoint.com", "northsidemarine1.sharepoint.com needs a sign-in to read"],
]

/** 2 addresses that could not be taken on a host that otherwise
 *  serves — so the host is not the reason and cannot carry the
 *  sentence. A dead file on a healthy site: the fix is a corrected
 *  address in the workbook, which is the business's and not ours
 *  (IMAGE_SPEC.md §1.7).
 *
 *  northsidemarine.com.au is on THIS list rather than in ABSENT_HOSTS
 *  because it is no longer a host that answers nothing: every other
 *  address on it is held, each one recovered from the dealership's own
 *  mirror of that same address rather than from the site. This one the
 *  mirror never had either. */
export const ABSENT: ReadonlyArray<readonly [string, string]> = [
  ["https://www.northsidemarine.com.au/highfield-boats/wp-content/uploads/sites/10/2025/03/Highfield-Ultralite-240-19.jpg", "northsidemarine.com.au serves its pictures to its own site only"],
  ["https://www.stacer.com.au/site/stacer.com.au/filesystem/images/Boat%20Images/2024/609%20Ocean%20Ranger/609OceanRanger_PKG_2024.jpg", "stacer.com.au no longer has that picture"],
]

/** Copies taken, addresses measured and found unavailable, and the bytes
 *  those copies weigh — counted from the manifest rather than typed, so a
 *  re-fetch cannot leave a stale number behind. */
export const NORTHSIDE_PICTURES = {
  held: HELD.length,
  absent: 6,
  /** Addresses in the seed with NO answer of any kind — no copy, no
   *  measured refusal, and not on a host already recorded as serving
   *  nothing. They draw as "Held as a link", exactly like a refused
   *  one; the difference is that nobody has asked yet. Clear it with
   *  `python tools/seed/fetch_images.py`. */
  unmeasured: 227,
  bytes: 9141262,
  measured: "2026-08-27",
} as const

/** Hand the engine what shipped. Called once, from `@/demos`, which the
 *  shell imports — so the answer is in place before the first thumbnail
 *  asks for it, whether the sheet was just seeded or restored from a
 *  previous session. */
export function registerNorthsidePictures(): void {
  registerSeededPictures(HELD, ABSENT_HOSTS, ABSENT)
}
