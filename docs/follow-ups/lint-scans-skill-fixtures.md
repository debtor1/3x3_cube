# bun run lint이 스킬 폴더의 eval fixture 때문에 실패한다

**Symptom**: `bun run lint`이 프로젝트 소스와 무관한 18개 오류로 실패한다. 모두 `@typescript-eslint/no-require-imports`이고, `.agents/skills/`와 `.claude/skills/` 아래 eval fixture의 `server.js` 파일에서 나온다.

**Observed evidence**: `bun run lint` 실행 시 `.agents/skills/babysit-specs/evals/fixtures/queued-specs/server.js`, `.agents/skills/shape-idea/evals/fixtures/notification-preview/server.js`, `.agents/skills/shape-idea/evals/fixtures/notification-settings/server.js`와 `.claude/skills/` 아래 같은 이름의 세 파일에서 각각 3개씩 보고된다. `git log -1 -- .claude/skills/shape-idea/evals/fixtures/notification-preview/server.js`는 `3327f83 Initial commit`을 가리키므로 흰 십자가 작업이 만든 파일이 아니다.

**Suspected cause**: `eslint.config.mjs`에 무시 경로가 없어서 설치된 스킬 패키지의 fixture까지 검사 대상에 들어간다. 이 파일들은 스킬이 자기 eval을 돌릴 때 쓰는 Node 스크립트라 CommonJS `require`를 쓰는 것이 정상이다.

**What was tried**: 흰 십자가 작업에서는 `bunx eslint app components lib`로 프로젝트 소스만 검사해 통과를 확인했다. 스킬 폴더는 손대지 않았고 `eslint.config.mjs`도 그대로 두었으므로 `bun run lint`는 여전히 실패한다.

**Proposed next step**: `eslint.config.mjs`의 `ignores`에 `.agents/**`와 `.claude/**`를 넣고 `bun run lint`가 프로젝트 소스만 검사하도록 바꾼다. 스킬 설치 방식이 두 디렉터리를 같은 내용으로 유지하므로(AGENTS.md의 `Copy to all agents` 정책) 두 경로를 함께 넣어야 한다.
