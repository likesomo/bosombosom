# 아트 레퍼런스와 아트 톤 결정 (2026-11-27)

- 핀 원본: `docs/references/pinterest/<장면>/` (34장) · 출처 URL: `docs/references/pinterest/sources.tsv`
- 핀 이미지는 **구도·색감 참고용**입니다. 그대로 쓰거나 따라 그리지 않습니다(저작권). 게임 원화는 GPT로 새로 생성합니다.

## 1. 아트 톤 (기준: 솜님 보솜이·라이벌 시안)

| 항목 | 기준 |
|---|---|
| 기법 | 도트(픽셀) 아트. 128px 원화를 4배 확대한 느낌의 또렷한 픽셀, 안티에일리어싱 없음 |
| 외곽선 | 1px 어두운 남색 외곽선, 부드러운 셀 음영 |
| 캐릭터 | 크림·복숭아색 보솜이, 노랑·하늘·분홍 별 장식 (반짝이 = 우리 팀 상징) |
| 배경 기본색 | 깊은 남보라 밤하늘 `#1c1636`~`#2a2350`, 강조 주황 `#ff9a4a`·하늘 `#7fd4ff` |
| 경기장 공통 구도 | 측면 시점, 화면 가운데 떠 있는 무대(양 끝이 낭떠러지 → 장외), 무대 윗면은 화면 높이 약 78% 지점, 캐릭터 자리는 비워 둠 |
| 경기별 색 | 8강 따뜻한 밤 상가(주황 간판) → 4강 숲 노을(초록·금) → 결승 네온 비(핫핑크·시안) — 갈수록 화려하게 |
| 글자 | 이미지에 글자 넣지 않음. 글자는 게임 화면에서 얹음 |
| 금지 | 유니티짱·스매시·포켓몬 등 타사 캐릭터, 로고, 실제 브랜드 |

## 2. 장면별 결정

| 장면 | 채택 레퍼런스 | 가져올 점 | 생성할 원화 |
|---|---|---|---|
| 오프닝·엔딩 경기장 | `opening_stadium/opening_stadium_03.jpg` ★ | 좌우 대칭 관중석, 가운데로 모이는 시선, 노을빛 하늘 | `bg_arena_opening` (가운데 시상대) |
| 8강 빌드됐조 | `quarter_city/quarter_city_03.jpg` ★, `_01` 보조 | 밤의 동네 상가 거리(28병특 작품의 상가 거리와 연결), 따뜻한 간판 불빛 | `bg_stage_quarter_city` |
| 4강 나가자싸우자이기자 | `semifinal_forest/semifinal_forest_03.jpg` ★ | 겹겹의 나무 레이어, 따뜻한 숲 빛(Leaf & Leap 초원과 연결) | `bg_stage_semifinal_forest` |
| 결승 GenJ | `final_neon/final_neon_03.jpg` ★, `_02` 분위기 | 네온 간판 + 비, 핫핑크·초록 대비(Net Runner와 연결) | `bg_stage_final_neon` |
| 장외 구도 | `battle_stage/battle_stage_06.jpg`, `ko/ko_01.jpg` | 떠 있는 돌 무대, 양옆이 열린 화면 / 장외로 날아가는 연출 방향 (구도만) | 각 경기장에 공통 적용 |
| 트로피 | `trophy/trophy_03.jpg` ★ | 2톤 금색 도트 트로피, 단순한 실루엣 | `obj_trophy` (투명, 회색 버전은 코드로 채도 제거) |
| 체력바 | `ui/ui_hp_02.jpg` ★, `ui_hp_01` | 장식 테두리가 있는 보스 체력바 | `ui_hp_frame` (투명) |
| 타이틀 | `title/title_02.jpg` ★, `title_01` 로고 감성 | 로고 + 세로 메뉴 배치, 둥글고 귀여운 로고 | 타이틀 배경은 `bg_arena_opening` 재사용 |
| 대진표 | `ui_bracket/ui_bracket_02.jpg` | 어두운 배경의 카드형 대진 배치(구성만) | `bg_bracket` |

## 3. GPT 원화 생성 결과 (assets/generated/, 전부 1차 채택)

| 파일 (게임용) | 채택 | 바닥 높이 `floorY` (720 기준) | 메모 |
|---|---|---|---|
| `backgrounds/bg_arena_opening_1280.png` | ✅ | 약 0.78 (562px) | 가운데 빈 시상대 → 트로피를 코드로 얹음 |
| `backgrounds/bg_stage_quarter_city_1280_web.png` | ✅ | 약 0.80 (575px) | 벚꽃 상가 + 크레인. 철골 무대 |
| `backgrounds/bg_stage_semifinal_forest_web.png` | ✅ | 약 0.74 (532px) | 노을 숲, 이끼 무대 |
| `backgrounds/bg_stage_final_neon_1280_web.png` | ✅ | 약 0.76 (547px) | 네온 셰프 모자·프라이팬 간판, 비 |
| `ui/obj_trophy.png` | ✅ | — | 별 보석 3색 = 팀 상징. 회색 버전은 코드로 채도 제거 |
| `ui/ui_hp_frame.png` | ✅ | — | 왼쪽 원형 초상 슬롯, 내부 투명 |
| `backgrounds/bg_bracket.png` | ✅ | — | 위쪽 트로피 포함, 가운데 비어 있음 |

- 보솜이·라이벌 원화를 올려 합성 확인: 화풍(도트, 남색 외곽선, 남보라 밤)이 솜님 시안과 잘 맞습니다.
- 바닥 높이가 경기장마다 달라서 `data/stages.json`에 `floorY`로 둡니다.

탈락: `battle_stage_01~05`(격투게임 사진·애셋 팩 광고), `opening_stadium_01~02`(축구장 탑뷰), `ending_01`(흐릿함), `ui_bracket_01·03`(웹/앱 UI), `ui_hp_04`(RPG 파티 UI), `trophy_01·02·04`(너무 단순).
