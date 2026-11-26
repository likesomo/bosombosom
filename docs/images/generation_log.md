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
