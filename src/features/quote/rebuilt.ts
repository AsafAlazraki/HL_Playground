/* ============================================================
   WHICH BUILD OF A SCREEN A PERSON IS LOOKING AT.

   `docs/plan/REBUILD.md`: build alongside, migrate screen by
   screen, delete the old layer last. One switch selects, so the
   branch always runs and a half-finished screen never takes the
   app down with it.

   IT IS THE HASH, NOT A SEARCH PARAM, AND THAT WAS MEASURED. The
   first version read `?build=new` and never fired once:
   `src/app/url.ts` OWNS the query string and rewrites it from the
   stage's own address table on every navigation, so a parameter it
   does not know is stripped before any screen reads it. Driven in
   Chrome, the URL came back as `?at=quote&id=lIl1MKj2iE` with the
   flag gone and the old screen rendered.

   The hash survives that rewrite, so `#build=new` turns it on and
   `#build=old` turns it off — and the answer is remembered, so a
   navigation that drops the hash does not silently throw somebody
   back to the old screen mid-comparison.

   ============================================================
   THE REBUILT SCREENS ARE THE DEFAULT NOW, AND THAT IS WHAT THE
   SWITCH WAS BUILT TO MAKE SAFE.

   Six screens are rebuilt, driven end to end from an empty profile,
   and measured — `docs/research/visual-qa-rebuild.md` is the
   scoreboard. Home, the picker, a place and a catalogue run 6.86x
   scale contrast against the 3.09/3.68/3.09/2.45x they replaced;
   Data runs 2.82x with eighteen rows in view against six cards in
   800px. 720 text leaves composited against the ground they are
   actually drawn on, none under 4.5:1. No mid-word cut anywhere,
   measured with a ruler that was itself fixed twice.

   A flag nobody can find is a flag nobody tests. `#build=old` still
   returns every shipped screen, in one press, and the answer is
   remembered — which is the whole reason this is a URL and not a
   build-time constant.
   ============================================================

   BOTH DIRECTIONS ARE REACHABLE BY URL, which is the rule that
   matters for a kill switch: whoever is looking at a broken screen
   must be able to leave it without knowing where a setting lives.

   ONE MODULE BECAUSE TWO SCREENS ASK. It lived inside `QuotePage`
   until the picker needed the same answer, and a switch copied
   into a second file is a switch that can disagree with itself.

   This whole file goes when the old screens do.
   ============================================================ */

const PREF = 'hl.quote.build.v1'

/** Is this person on the rebuilt screens? */
export function rebuiltBuild(): boolean {
  try {
    const hash = window.location.hash.replace(/^#/, '')
    const asked = new URLSearchParams(hash).get('build')
    if (asked === 'new' || asked === 'old') {
      localStorage.setItem(PREF, asked)
      return asked === 'new'
    }
    /* NEVER ASKED BEFORE MEANS THE REBUILT ONES. Only an explicit
       `#build=old` opts out, and it is remembered once given. */
    return localStorage.getItem(PREF) !== 'old'
  } catch {
    /* No `window`, no URL, or storage refused is not a reason to
       fail to draw a quote — it is a reason to draw the screens
       that have been measured. */
    return true
  }
}

/** The picker follows the same switch. Named separately so the two
 *  can be split if one screen ever needs to ship ahead of the
 *  other — the call sites should not have to change to find out. */
export const rebuiltPicker = rebuiltBuild
