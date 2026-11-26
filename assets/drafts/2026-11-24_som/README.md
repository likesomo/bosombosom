# 솜님 자료 초안 (2026-11-24 전달)

원본 위치: `Downloads\솜님자료초안` · 정리일 2026-11-27 · 원본 파일은 그대로 복사했고 이름만 바꿨습니다.

## 보솜이 (`bosomi/`)

| 파일 | 원본 파일명 | 내용 |
|---|---|---|
| `bosomi_motion_frames_sheet.png` | KakaoTalk_20261124_183227853.png | 모션 프레임 시트 1720×2560: transform 4, idle_spike 2, attack 4, guard 3, heavy 6, hurt 2, ko 3, victory 3 (프레임별 ms 표기) |
| `bosomi_spike_expressions_sheet.png` | KakaoTalk_20261124_183219195.png | 가시 상태 표정 7종: angry, fierce, guard, hurt, dizzy, smug, surprised |
| `bosomi_skill_draft.txt` | 보솜이 스킬 초안.txt | 흉내(L), 가시 반격(패시브), 등장 변신 |

| `bosomi_concept_01.jpg` | 보솜이시안/KakaoTalk_20261124_170058631.jpg | 보송형 (변신 전) |
| `bosomi_concept_02.jpg` | 보솜이시안/…_01.jpg | 기사 투구형 (중간 형태) |
| `bosomi_concept_03.jpg` | 보솜이시안/…_02.jpg | 가시형 (전투 기본) |

> 시안 3장(512×512, 흰 배경 JPG)은 배경을 지워 투명 PNG로 만들어 `assets/characters/`에 두었습니다: `bosomi_fluffy.png`, `bosomi_armored.png`, `bosomi.png`(가시형 = 기본).

> 두 시트는 체커 무늬가 그림에 찍힌 **설명용 이미지(투명도 없음)**입니다. 게임에 쓰려면 프레임별 투명 PNG(128×128 또는 512×512)가 필요합니다.

## 라이벌 (`rivals/`, 게임용 복사본은 `assets/characters/`)

모두 512×512 투명 PNG로 규격에 맞습니다. 팀 매칭은 스킬 초안으로 추정한 뒤, 스터디 1기 쇼케이스의 팀장·시드멤버 작품과 대조해 거의 확인했습니다(`docs/rival-characters.md`). 회색 2종(가려진 적)만 솜님 확인이 필요합니다.

| 파일 (= 캐릭터 id) | 원본 접미사 | 추정 팀 | 추정 근거 |
|---|---|---|---|
| `rival_sorceress.png` | _10 | 소서리스 (공격) | 오각 보석 지팡이, 뒤의 기사 그림자 → "다섯 정수 낙인" |
| `rival_anogame.png` | _03 | 아노게임 (공격) | 모니터에서 튀어나오는 너클 → "화면 밖 펀치" |
| `rival_moonrabbit.png` | _09 | 문래빗 (지원) | 달 지팡이를 든 토끼 → 이름 |
| `rival_tansujoa.png` | (없음) | 탄수조아 (탱커) | 식빵 기사, 몸 절반이 흑백 → 탄수 + "컷!" 흑백 필름 |
| `rival_genj.png` | _06 | GenJ (공격) | 네온 프라이팬, 미나리 장식 → "네온 팬케이크 뒤집기" |
| `rival_jackpot.png` | _07 | 잭팟 | 777 카드, 장미 → "777 잭팟 카드" |
| `rival_nagaja.png` | _08 | 나가자싸우자이기자 (공격) | 나뭇잎 망토 햄스터 → 함성의 나뭇잎 |
| `rival_buildedjo.png` | _04 | 빌드됐조 (탱커) | 안전모 로봇, 체크 표시 화면 → "빌드 완료 낙하" |
| `rival_ex.png` | _05 | 엑스 (지원) | 회중시계 개구리 → "시간 정지 티타임" |
| `rival_masked_phase1.png` | _01 | 가려진 적 1페이즈 (오프닝) | 회색 몸 + 노이즈 번짐 → "색 빼앗기" |
| `rival_masked_phase2.png` | _02 | 가려진 적 2페이즈 (결승) | 노이즈가 온몸으로 번진 강화형 |

## 스킬 초안 원문 (`rivals/rival_skill_draft.txt`) 확인 필요

카톡 복사 과정에서 잘린 줄이 있습니다. 솜님께 원문을 다시 받아야 합니다.
- 아노게임 항목이 2번 들어가 있고, 첫 번째는 소서리스의 가드 문구가 섞여 있음
- 잘린 가드 반응: 문래빗, GenJ, 잭팟, 나가자싸우자이기자, 엑스, 가려진 적
- 잭팟의 역할(공격/탱커/지원)이 비어 있음
