# 4단계 건너뛰기 e2e가 가끔 실패한다

`e2e/yellow-cross.spec.ts`의 "다음 단계로 건너뛰기 버튼으로 1단계부터 4단계 완료까지" 테스트가 47번째 줄 `piece-indicator` 확인에서 다섯 번 중 한 번꼴로 실패한다(2026-11-15, 완성 판정 수정 작업 중 관찰). 수정 전 코드에서도 `--repeat-each=15`로 15번 중 3번 같은 줄에서 실패했다. 시드 없는 "무작위로 채우기"로 시작해서, 4단계 첫 동작이 표시(`indicators`) 없는 동작인 경우가 있는 것으로 짐작한다. 단위 테스트 쪽 같은 현상은 `cross-trainer-random-stage-tests-flaky.md`, `stage6-skip-test-flaky.md`에 있다. 고정된 섞기 수순으로 시작하면 고칠 수 있다.
