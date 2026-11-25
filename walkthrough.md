# Security Summary

**Reviewed Files**: 6 (original prototype HTML/JS/CSS/SVG + new full-stack TypeScript implementation)
**Issues Resolved**: 6

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Client-Side Auth Bypass | `server.ts`, `src/App.tsx` | 1 | Original prototype merely toggled a `.hidden` CSS class on `#appShell` without verifying credentials or maintaining a server session. | High | Fixed | Implemented server-side authentication with `scrypt` password hashing, HMAC-signed Bearer tokens stored strictly in React memory, and `/api/*` auth middleware. |
| Client-Side Privilege Escalation | `server.ts`, `src/App.tsx` | 1 | Role permissions in the original prototype only hid DOM buttons via JS, allowing any user to switch to `admin` or trigger restricted actions. | High | Fixed | Enforced server-side role checks (`requireRole`) on course creation, assignments, user management, and CSV exports; restricted self-signup to the `staff` role. |
| Unsafe HTML Rendering (`innerHTML`) | `src/components/*` | 1 | Original JS constructed course cards, activity rows, and player views via raw template strings passed to `innerHTML`. | High | Fixed | Replaced all `innerHTML` rendering with React JSX text bindings so user-entered course titles and names are safely escaped. |
| CSV Formula Injection | `server.ts` | 1 | Original `exportCsv()` only escaped double quotes without neutralizing formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`). | Medium | Fixed | Added `csvCell()` neutralization prefixing dangerous leading characters with `'` before quoting. |
| Fragile External Image Dependency | `src/components/LoginScreen.tsx` | 1 | Original CSS loaded the login background from an external third-party URL (`images.unsplash.com`). | Low | Fixed | Generated local image assets in `/src/assets/images/` with CSS gradient fallbacks. |
| Broken Markup & Dead Controls | `src/App.tsx`, `src/components/*` | 1 | Original HTML contained malformed `<img ...;">` syntax, duplicated CSS blocks, partial translations, and unwired buttons (`#profileMenuBtn`, placeholder views). | Low | Fixed | Corrected markup, removed duplicate styles, completed FR/EN translations, and wired every view and interactive button. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Password Storage | `server.ts` | Uses per-user 16-byte random salts with `crypto.scryptSync` and constant-time `crypto.timingSafeEqual` verification. |
| Session Tokens | `server.ts`, `src/App.tsx` | HMAC-SHA256 signed session tokens are held exclusively in React component memory (never `localStorage` or `sessionStorage`) and invalidated on logout. |
| First-Run Admin Claim | `server.ts`, `src/components/LoginScreen.tsx` | One-time `/api/auth/setup-admin` atomically provisions the initial administrator when `ADMIN_PASSCODE` is unset and permanently locks afterward (`409 Conflict`). |
| Input Validation | `server.ts` | Validates email format, string lengths, allowed role enums, date formats (`YYYY-MM-DD`), and sequential quiz level progression. |

## PoC Verification

### Unauthenticated Access & Client-Side Role Escalation Attempt
#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Server-Side Auth & Role Enforcement |
| Impact | High |
| Affected File | `server.ts:346-470` |
| Test Scenario | Sending an unauthenticated `POST /api/courses` or a `staff`-authenticated `POST /api/users` with `role: "admin"` |

#### How It Was Fixed
Every protected endpoint uses `requireAuth` to verify the signed Bearer session token and `requireRole([...])` to check the user's server-stored role.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request arrives at `POST /api/courses` or `POST /api/users` | Enters Express middleware chain |
| 2 | `requireAuth` (`server.ts:346`) checks `Authorization: Bearer <token>` signature and expiration | Unauthenticated requests receive `401` |
| 3 | `requireRole(['admin', 'management', 'trainer'])` (`server.ts:375`) checks `req.authUser.role` | Non-authorized roles (e.g. `staff`) receive `403` |
| 4 | Final result | **Handled Safely** |

#### Conclusion
**Fix Verified** - Neither unauthenticated callers nor low-privilege accounts can execute administrative mutations or escalate roles via client-side manipulation.

### CSV Formula Injection Attempt
#### Summary
| Field | Value |
|---|---|
| Issue Type | Formula Injection in CSV Export |
| Impact | Medium |
| Affected File | `server.ts:100-106` |
| Test Scenario | Creating a course titled `=CMD('calc')` and downloading `/api/reports/export` |

#### How It Was Fixed
All exported cells pass through `csvCell()`, which detects leading `=`, `+`, `-`, `@`, `\t`, or `\r` characters and prefixes them with `'`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Course title `=CMD('calc')` is requested in `/api/reports/export` | Passed into `rows.map((r) => r.map(csvCell))` |
| 2 | `csvCell()` (`server.ts:102`) matches `/^[=+\-@\t\r]/` | Value becomes `'=CMD('calc')` |
| 3 | Final result | **Handled Safely** as literal text `" '=CMD('calc')"` |

#### Conclusion
**Fix Verified** - Spreadsheet applications treat neutralized cells as plain text instead of executable formulas.
