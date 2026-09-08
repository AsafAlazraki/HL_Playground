/* ============================================================
   Setup for the `ui` project only — see vitest.config.ts.

   jest-dom's matchers are the whole point: `toBeInTheDocument`,
   `toHaveAccessibleName`, `toBeVisible`. They read as sentences about
   what a person can perceive, which is the only kind of assertion
   worth making about a component. A test that asserts on class names
   is a test that fails when the class is renamed and passes when the
   screen is broken.
   ============================================================ */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/* Every test gets an empty document. Without this, a component from
   the previous test is still mounted and `getByRole` finds two. */
afterEach(() => {
  cleanup()
})
