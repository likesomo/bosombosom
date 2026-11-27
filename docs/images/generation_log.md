# 이미지 생성 기록

## 2026-11-27 라이벌 3종 GPT 비교용 초안
- 모델: gpt-6-astra, 노력 수준: medium (Codex CLI, $imagegen)
- 명령 형식: codex exec --skip-git-repo-check --sandbox workspace-write -m gpt-6-astra -c 'model_reasoning_effort="medium"' -i assets/drafts/2026-11-24_som/bosomi/bosomi_concept_03.jpg -- 'Use $imagegen to create <pixel art sprite prompt>. Save it as docs/images/rivals_gpt/<file>.png'
- 용도: 솜님 라이벌 시안과의 비교용 (대체 아님). 스타일 참고 이미지는 선 굵기·채도용으로만 첨부.
- 결과 (재생성 0회, 모두 512x512 RGBA, 알파 있음):
  - docs/images/rivals_gpt/gpt_rival_genj.png
  - docs/images/rivals_gpt/gpt_rival_nagaja.png
  - docs/images/rivals_gpt/gpt_rival_buildedjo.png

## 2026-11-27 게임 배경·오브젝트·UI 원화 7종 (프로토타입용 초안)
- 모델: gpt-6-astra, 노력 수준: medium (Codex CLI, $imagegen)
- 명령 형식: codex exec --skip-git-repo-check --sandbox workspace-write -m gpt-6-astra -c 'model_reasoning_effort="medium"' -i docs/references/pinterest/<장면>/<ref>.jpg -i assets/characters/bosomi.png -- 'Use $imagegen to create <prompt>. Save it as assets/generated/<용도>/<file>.png'
- 레퍼런스는 구도·색감 참고용, bosomi.png는 화풍 통일용으로만 첨부. 재생성 0회(전부 1차 채택).
- 결과:
  - assets/generated/backgrounds/bg_arena_opening.png (1672x941), _1280 사본 추가 (레퍼런스 opening_stadium_03)
  - assets/generated/backgrounds/bg_stage_quarter_city.png (1672x941), _1280, _1280_web 사본 (quarter_city_03)
  - assets/generated/backgrounds/bg_stage_semifinal_forest.png (1280x720), _web 사본 (semifinal_forest_03)
  - assets/generated/backgrounds/bg_stage_final_neon.png (1672x941), _1280, _1280_web 사본 (final_neon_03)
  - assets/generated/ui/obj_trophy.png (512x512 RGBA) (trophy_03)
  - assets/generated/ui/ui_hp_frame.png (1024x256 RGBA) (ui_hp_02)
  - assets/generated/backgrounds/bg_bracket.png (1280x720) (ui_bracket_02)
- 후처리: _1280은 NEAREST 리사이즈, _web은 256색 양자화(디더 없음)로 1MB 미만.

## 2026-11-27 탑다운 바닥 텍스처 4종 (탑다운 전투 전환용 초안)
- 모델: gpt-6-astra, 노력 수준: medium (Codex CLI, $imagegen)
- 명령 형식: codex exec --skip-git-repo-check --sandbox workspace-write -m gpt-6-astra -c 'model_reasoning_effort="medium"' -i assets/generated/backgrounds/<기존 배경>.png -i assets/characters/bosomi.png -- 'Use $imagegen to create <top-down floor prompt>. Save it as assets/generated/floors/<file>_raw.png in the current folder.'
- 기존 측면 배경은 색감·분위기용, bosomi.png는 화풍 통일용으로만 첨부. 재생성 0회(전부 1차 채택).
- 결과 (모두 1280x720, 원본 1672x941을 16:9 크롭 후 NEAREST 리사이즈, _web은 256색 양자화 디더 없음, 1MB 미만):
  - assets/generated/floors/floor_arena.png, floor_arena_web.png
  - assets/generated/floors/floor_quarter_city.png, floor_quarter_city_web.png
  - assets/generated/floors/floor_semifinal_forest.png, floor_semifinal_forest_web.png
  - assets/generated/floors/floor_final_neon.png, floor_final_neon_web.png
- 원본(_raw)은 프로젝트 밖 임시 폴더로 옮김.

## 2026-11-27 가시 가드 이펙트 2종 (기존 픽셀 이펙트 교체용 초안)
- 모델: gpt-6-astra, 노력 수준: medium (Codex CLI, $imagegen)
- 명령 형식: codex exec --skip-git-repo-check --sandbox workspace-write -m gpt-6-astra -c 'model_reasoning_effort="medium"' -i assets/characters/bosomi.png -- 'Use $imagegen to create <fx prompt>. Save it as assets/generated/fx/<file>.png in the current folder.'
- bosomi.png는 색·질감 참고용으로만 첨부. 캐릭터는 그리지 않음. 재생성 0회(전부 1차 채택).
- 프롬프트 요약: guard_spike_burst = 가운데가 빈 완전 방사형 크림/연분홍 가시 폭발 + 흰 반짝임·충격선. guard_aura = 위에서 비스듬히 본 2:1 납작 타원 가시 링 + 은은한 연분홍 빛, 가운데 투명.
- 결과 (RGBA, 알파 있음, 중앙 투명):
  - assets/generated/fx/guard_spike_burst.png (1024x1024)
  - assets/generated/fx/guard_aura.png (1024x512)
- 후처리: 둘 다 가장자리의 붉은/자홍색 크로마키 잔여 픽셀을 투명 처리. guard_spike_burst는 아래쪽 가시가 캔버스 끝에 닿아 있어 bbox 기준으로 중앙 정렬하고 960px 안으로 축소(여백 확보). 1MB 미만이라 별도 축소본 없음.
