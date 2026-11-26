# 데이터 수정 가이드 (data/*.json)

코드를 열지 않고 JSON만 고쳐도 이름·수치·대진이 바뀝니다. 고친 뒤 브라우저를 새로고침하세요.
잘못된 값이 있으면 브라우저 콘솔(F12)에 `[data] ... problem(s)` 로 어느 파일의 어느 항목인지 나옵니다.
모든 항목의 `id`는 영어 소문자·밑줄, 중복 금지입니다.

## characters.json — 캐릭터
| 키 | 뜻 |
|---|---|
| `id` | 캐릭터 id. 이미지 파일은 `assets/characters/<image>.png` |
| `name` | 화면에 나오는 이름 |
| `teamId` | teams.json의 팀 id |
| `role` | tank / attack / support (이미지가 없을 때 도형 모양) |
| `color` | 이미지가 없을 때 도형 색 |
| `image` | 기본 이미지 파일명 (보솜이는 `imageFluffy`·`imageArmored`도 사용) |
| `scale` | 화면 크기 배율 (512px 원화 × scale) |
| `maxHp` | 체력. **경기 시간이 길면 라이벌의 maxHp부터 줄이세요** |
| `speed` | 이동 속도 (px/초) |
| `jumpPower` | 점프 힘 (보솜이만) |
| `signatureSkillId` | 대표 스킬 id (skills.json) |
| `phase2` | 결승 2페이즈: `atHpRatio`(체력 비율), `speedScale`, `cooldownScale`, `extraSkillIds` |

## skills.json — 기술
| 키 | 뜻 |
|---|---|
| `name` | 화면 이름 (흉내 칸에도 표시) |
| `type` | melee(근접) / dash(돌진) / launcher(띄우기) / drop(설치→낙하) / shockwave(음파) / mimic / guard |
| `power` | 피해량 |
| `range` | 사거리 (px) |
| `cooldown` | 재사용 대기 (초) |
| `telegraph` | 라이벌이 쓰기 전 예고 시간 (초). 길수록 막기 쉬움 |
| `knockback`, `launch` | 밀려나는 힘, 띄우는 힘 |
| `guardDamageScale` | 음파를 가드했을 때 남는 피해 비율 |
| `counterPower`, `counterKnockback` | (guard) 가시 반격 피해·밀어내기 |
| `fx`, `fx2` | 이펙트 이름 (`assets/fx/` 파일명) |
| `telegraphText`, `guardText`, `shoutText`, `color` | 연출 문구와 색 |

## teams.json — 팀
`name`, `captain`, `seed`, `color`(팀 색), `characterId`(대표 캐릭터), `isPlayer`(우리 팀), `hidden`(대진표에 안 나옴)

## bracket.json — 대진
- `leftTeamIds` / `rightTeamIds`: 대진표 왼쪽·오른쪽 5팀
- `rouletteTeamIds`: 첫 방문 추첨 룰렛이 도는 팀 (결과는 항상 첫 경기 상대로 고정)
- `matches`: 실제 경기 순서. `label`(8강 등), `opponentTeamId`, `stageId`. 개수를 바꾸면 경기 수와 숫자 단축키 범위가 같이 바뀜

## stages.json — 경기장
`image`(배경 경로), `floorY`(무대 윗면 높이, 720 기준 px), `platformLeft`/`platformRight`(움직일 수 있는 좌우 끝), `rain`(비 효과)

## texts.json — 화면 문구
타이틀, 메뉴, 전투 문구("따끔!", "별이 됐다!"), `cheerLines`(팀 id별 응원 대사), `endingCredits`(Day 1~4 개발 로그 줄 목록), `endingLast` 등.
