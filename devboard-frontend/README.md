# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

next task : 
1.change the feature from string to object array DONE
 each obj includes the done : bool and the task it self  :string DONE
 chnage the ui to be a toggle button DONE

2.make the comletion field have actual percentage OR make a new percentage field  DONE

3.create use hook for it to be able to toggle it status DONE
 useReducer and... we need to brqaian strom this DONE

4.multiple input option techstack DONE
5.layout divide into 3 parts DONE
6.percentage data transfer to ProjectDetails  DONE

7.create tech stack ui DONE
8.append to feature ui button DONE
9.updatable every field 
10.removable everything (project ,feature ,tech) 
11.update tech stack array

about: 
people can create track manage their projects here help them better decide their requirement, project prep time saver using AI . helping them decide whats the best language, stack, feature listing for their given project summary.

# Testing + CI/CD Reference Checklist

## Part 1: Unit + Integration Testing (Vitest + React Testing Library)

### Install
```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Config — `vite.config.ts`
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['tests/**', 'node_modules/**'], // keep Playwright out
  },
})
```

### Setup file — `src/test-setup.ts`
```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

### package.json script
```json
"scripts": {
  "test": "vitest"
}
```

### File naming
- Unit test (pure function, no JSX): `MyFunc.test.ts`
- Integration test (renders a component): `MyComponent.test.tsx` — must be `.tsx` if JSX is used

### Core patterns to remember
- `vi.fn()` → fake trackable function (for props/context callbacks)
- `render(<Component />)` — wrap in `Context.Provider` if the component uses context
- Queries: `screen.getByPlaceholderText(...)`, `screen.getByRole(...)`, `screen.getByText(...)`
- User interaction: `const user = userEvent.setup(); await user.type(...); await user.click(...);`
- Assertions: `expect(...).toBeInTheDocument()`, `.toHaveValue()`, `.toHaveBeenCalledWith()`, `.toHaveBeenCalled()`, `.toHaveBeenCalledTimes(n)`
- `expect.any(String)` / `expect.any(Array)` for unpredictable values (e.g. generated IDs)
- Async mocks: `vi.fn().mockResolvedValue([...])` for faking API/data calls

### Testing philosophy
- Unit test = pure function, no rendering, no UI
- Integration test = one component rendered, with fakes for its external dependencies (context, callback props)
- Isolate one condition per `it()` block — don't bundle multiple checks into one test
- Test both the "should fail" and "should succeed" paths, not just errors
- Name tests by scenario ("returns false when X"), not by field name

---

## Part 2: E2E Testing (Playwright)

### Install
```bash
npm init playwright@latest
```

### Config — `playwright.config.ts`
- Set `use.baseURL` to match your dev server's actual URL/port (check what `npm run dev` actually prints — ports can shift)
- Set:
```ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:5173', // match your actual port
  reuseExistingServer: !process.env.CI,
},
```

### File naming
`*.spec.ts`, inside the `tests/` folder Playwright creates

### Core pattern
```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('description of user journey', async ({ page }) => {
  await page.getByRole('link', { name: '...' }).click();
  await page.getByPlaceholder('...').fill('...');
  await page.getByRole('button', { name: '...' }).click();
  await expect(page.getByText('...')).toBeVisible();
});
```

### Run
```bash
npx playwright test
```

### Notes
- Playwright runs the SAME test across every configured browser (chromium, firefox, webkit, etc.) by default — 1 test × 3 browsers = 3 runs
- Playwright uses its own isolated browser storage — doesn't touch your regular browser's real data
- `beforeEach` clearing localStorage keeps each test run starting from a clean slate, avoiding duplicate data across repeated runs

---

## Part 3: CI (GitHub Actions)

### Location matters
`.github/workflows/main.yml` must sit at the **repo root** — not inside a subproject folder, even in a monorepo with multiple project folders.

### If your app lives in a subfolder
Add `working-directory: your-folder-name` to every `run` step.

### Basic Vitest-only CI workflow
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm install
        working-directory: your-folder

      - run: npm run test -- --run
        working-directory: your-folder
```

### Key gotchas
- Don't use `strategy.matrix` (multiple Node versions) unless you actually need multi-version testing — it multiplies runs and can cause confusing inconsistent failures
- `npm run test -- --run` — the `--run` flag forces a single pass (no watch mode), required for CI since it can't sit waiting forever
- **Vitest and Playwright must stay separated.** Vitest auto-discovers files by pattern (`.test.` / `.spec.`) — without `exclude: ['tests/**']` in `vite.config.ts`, Vitest will try to execute Playwright's `.spec.ts` files and crash, because Playwright's `test()`/`test.beforeEach()` only work when run by Playwright's own runner
- Adding E2E tests to CI is a deliberate **separate job/step** calling `npx playwright test` — it does NOT happen automatically just because Playwright is installed

### How CI actually works
- Pushing to GitHub always succeeds regardless of test results — CI does not block pushes
- CI blocks **merging** a Pull Request, only if branch protection rules are configured to require passing checks
- Check status: repo → **Actions** tab, or the ✅/❌ icon next to a commit/PR

edit dailog: 
	techstack fix, done✅
	edit doesnt work (api), done✅ 
	empty stale insead of entered text done✅ 
feature: 
	task not showing  done✅
	cant toggle task done✅
	cant add new feature(api)  done✅
  progress bar not connected done✅
  delete feature done✅
  delete task done✅
  dleting feature or task must also update the completion done✅  
  edit feature and task done✅
form:
  empty stack should be filtered out done✅ 
project:
	cant delete project(api) done✅
performance feature list toggle:
  optimistic updates done✅
deployment:
  vercel + railway
  dockerzise
  aws deploy
smart ai?:
  reserch??
ui upadte:
  figma + claude

to learn:
  trigger sql(optional)
  useRef understanad
  tanstack 
  optimistic updates