# 전투 이펙트 (pixelfx)

- 출처: https://github.com/patch-gg/pixelfx (MIT, commit 5294518, v0.3.1) · 라이선스 `LICENSE-pixelfx.txt`
- 생성: `node tools/render.mjs <category>/<name> --sheet` → 투명 PNG + Phaser atlas JSON(프레임별 duration ms)
- 파일명: `<category>_<name>.png/.json` · 로드: `this.load.atlas(key, 'assets/fx/x.png', 'assets/fx/x.json')`
- 기본 30fps, 효과 본래 크기(예: 200×112). 화면에서는 2~3배 확대 + 픽셀 필터(NEAREST).
- 색은 pixelfx `palette` 옵션으로 바꿔 다시 뽑을 수 있음(예: 솜 팔레트 흉내 버전).

## 용도 배치 (추천)

| 장면 | 효과 파일 | 쓰임 |
|---|---|---|
| 보솜이 기본 공격 적중 | `impacts_hit-spark`, `impacts_blunt-hit` | 작은 타격 |
| 가시 구르기(K) 적중 | `impacts_crit-hit`, `impacts_impact-frame` | 큰 타격 + 히트 스톱 |
| 가드 성공 / 가시 반격 "따끔!" | `impacts_parry`, `impacts_shield-block`, `nature_thorns` | 가드 반응 |
| 등장 변신 (보송 → 가시) | `spawn_poof`, `explosions_firework-burst`, `ui_exclamation` | 오프닝 "!" + 털 터짐 |
| 가려진 적 색 빼앗기 | `melee_claw-swipe`, `transitions_glitch-wipe` | 오프닝, 결승 2페이즈 진입 |
| 흉내 맞은 상대 "?" | `status_confused` | 흉내 적중 |
| 빌드됐조 RAM 블록 낙하 | `impacts_heavy-landing`, `impacts_ground-slam` | 8강 대표 스킬 |
| 나가자싸우자이기자 함성 | `lightning_thunderclap`(음파 고리), `nature_leaf-storm` | 4강 대표 스킬 |
| GenJ 팬케이크 뒤집기 | `melee_uppercut`, `lightning_electrified` | 결승 대표 스킬(네온) |
| 장외 KO 마무리 | `explosions_cartoon-pow`, `weather_shooting-stars` | 스매시식 "별이 됨" |
| 피해 숫자 | `ui_damage-number`, `ui_crit-number` | 체력 감소 표시 |
| 경기 시작 | `ui_countdown` | 3-2-1 |
| 엔딩 트로피 탈환 | `holy_sunburst`, `ui_confetti` | 트로피 색 복구 |
| 씬 전환 | `transitions_star-iris` | 장외 후 암전 |
| 기절 | `status_stunned` | 가드 반격에 당한 상대 |
| 예비 | `nature_earth-spike` | 가시 솟기 대안 |

## 주의
- `scifi_glitch`는 효과가 기본 더미 캐릭터 몸에 그려지는 종류라 시트에 더미가 함께 찍혀 있어 그대로 쓰지 않음. 결승 노이즈 2페이즈는 Phaser 틴트·흔들림·`transitions_glitch-wipe`로 표현.
- 전체 용량 약 12MB. 프레임이 긴 효과(thorns 73프레임 등)는 필요하면 프레임을 줄여 다시 뽑기.
