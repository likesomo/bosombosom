# 보솜보솜 챔피언십

"쇼미더유어게임" 시연용 2D 실시간 배틀 웹게임. 보솜이 1인으로 라이벌 3팀을 이기고 빼앗긴 트로피의 색을 되찾는다.

## 실행
브라우저 보안 정책 때문에 파일을 더블클릭하지 말고 정적 서버로 엽니다. (인터넷 연결 불필요)

```powershell
cd C:\.Bosombosom_Web
C:\Users\user-01\.local\bin\python3.12.exe -m http.server 8123 --bind 127.0.0.1
```
브라우저에서 http://127.0.0.1:8123 접속. 모든 경로가 상대 경로라 GitHub Pages에 그대로 올려도 됩니다.

## 조작
| 동작 | 키 |
|---|---|
| 이동 (8방향) | ← → ↑ ↓ 또는 W A S D |
| 가시 찌르기 | J |
| 가시 구르기 | K |
| 흉내 (직전에 맞거나 막은 상대 기술을 솜 버전으로) | L |
| 가시 가드 (누르고 있기, 닿은 상대에게 "따끔!" 반격) | Space |

## 시연용 단축키
| 키 | 동작 |
|---|---|
| R | 처음부터 |
| 1 / 2 / 3 | 8강 / 4강 / 결승으로 바로 이동 (앞 경기 응원단 자동 채움) |
| 0 | 엔딩으로 |

- 주소 뒤 `?start=3` → 로딩 후 결승으로 바로 시작, `?auto=1` → 자동 플레이(리허설·검증용)

## 구조
- `index.html`, `src/main.js` · `src/scenes/` 씬 7개 · `src/battle/` 전투 규칙(`rules.js`는 Phaser 비의존 순수 함수) · `src/ui/` HUD·이펙트·사운드
- `data/` 게임 데이터 JSON (설명: `docs/data-guide.md`) · `assets/` 원화·배경·이펙트 · `vendor/phaser-3.90.0.min.js`
- 설계 문서: `docs/scene-flow.md`, 라이벌 조사: `docs/rival-characters.md`, 아트 결정: `docs/references/art/README.md`

## 사용한 외부 자료
- Phaser 3.90.0 (MIT) · pixelfx 이펙트 (MIT, `assets/fx/LICENSE-pixelfx.txt`)
- 캐릭터 원화: 솜 · 배경/UI: GPT 생성 초안 (`docs/images/generation_log.md`)
