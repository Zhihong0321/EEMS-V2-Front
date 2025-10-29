# Agent Guidelines for EEMS-V2-Front

## API Collaboration Expectations
- Do **not** implement or modify API interactions without first confirming the exact request and response contract with the user or authoritative documentation.
- When the contract is unclear, pause coding and explicitly request the missing details. Document any outstanding questions in your response before attempting changes.
- If the user supplies updated API requirements, summarize them back for confirmation before editing files.

## Change Management Rules
- Avoid speculative fallbacks, legacy compatibility layers, or retries unless the user explicitly instructs you to add them.
- Prefer the simplest implementation that satisfies the confirmed contract; remove unused experimental logic.
- Explain how your planned changes satisfy the confirmed requirements before writing code when the user asks for it.

## Testing and Verification
- Describe how you would verify the change, even if execution is not possible in this environment.
- Provide users with clear manual testing steps they can run in their environment when automated tests cannot be executed here.

These guidelines exist to prevent regressions caused by guesswork and to ensure productive collaboration with the backend team.
