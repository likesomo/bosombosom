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
| `speed` | 이동 속도 (바닥 px/초) |
| `jumpPower` | (사용 안 함, 횡스크롤 버전 흔적) |
| `signatureSkillId` | 대표 스킬 id (skills.json) |
| `phase2` | 결승 2페이즈: `atHpRatio`(체력 비율), `speedScale`, `cooldownScale`, `extraSkillIds` |
| `staggerAtHpRatio` | 그로기("지금이 기회!")가 걸리는 체력 비율. 예: `0.2` = 20% 이하가 되는 순간 경기당 1번. 비우면 그로기 없음. 한 방에 0까지 떨어져도 체력 1로 남기고 그로기를 먼저 보여준다. 결승(`phase2`가 있는 캐릭터)은 2페이즈 이후에만 걸린다 |
| `staggerSeconds` | 그로기 동안 라이벌이 멈춰 있는 시간(초). 기본 `1.5`. 배너도 이 시간만큼 떠 있다 |

## skills.json — 기술
| 키 | 뜻 |
|---|---|
| `name` | 화면 이름 (흉내 칸에도 표시) |
| `type` | melee(근접) / dash(돌진) / launcher(띄우기) / drop(설치→낙하) / shockwave(음파) / mimic / guard |
| `power` | 피해량 |
| `shape` | 바닥 범위 모양: `cone`(부채꼴) / `circle`(원) / `line`(직선) / `dash`(돌진 경로). mimic·guard는 없음 |
| `range`, `angle` | (cone) 사거리 px, 벌어진 각도(도) |
| `radius`, `at` | (circle) 반지름 px, `self`(내 주변) 또는 `target`(상대 발밑에 설치) |
| `length`, `width` | (line·dash) 길이와 폭 px. dash는 `dashSpeed`(px/초)로 length만큼 돌진 |
| `lunge` | (근접) 휘두를 때 앞으로 나가는 거리 px |
| `motionMs`, `motionScale` | (근접) 휘두르는 모션 길이(ms)와 앞으로 늘어나는 비율. 없으면 140ms·0.15 |
| `cooldown` | 재사용 대기 (초) |
| `telegraph` | 라이벌이 쓰기 전 예고 시간 (초). 이 동안 바닥에 빨간 범위가 차오름. 길수록 피하기·막기 쉬움 |
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
- 전투(위에서 본 경기장): `floor`(바닥 이미지, 없으면 `floorColor`로 그림), `ringColor`(링 테두리 색), `rain`(비 효과)
- 링 크기: 파일 맨 위 `arenaDefaults` — `cx`·`cy`(링 중심), `rx`·`ry`(가로·세로 반지름, 화면 px), `perspective`(바닥 기울기, 세로 거리 배율), `unitScale`(전투 중 캐릭터 크기 배율, 0.36이면 보솜이가 화면 높이의 약 9%), `bodyRadius`(몸 반지름: 충돌·링 안쪽 여백·발밑 링 크기), `startOffsetX`(링 중심에서 시작 위치까지 가로 거리, 보솜이 왼쪽·라이벌 오른쪽), `startOffsetY`(보솜이는 이만큼 아래, 라이벌은 위), `fxScale`(전투 이펙트·가시 가드 그림 크기 배율, 캐릭터를 줄이면 같이 줄임). 근거는 `docs/reference-analysis-2.md` 4-1. 경기장마다 `"ring": { ... }`로 일부만 덮어쓸 수 있음
- 연출 씬(타이틀·응원·엔딩): `image`(배경 경로), `floorY`(무대 윗면 높이, 720 기준 px), `platformLeft`/`platformRight`

- `battleIntro`(파일 맨 위): 전투 시작 연출 길이(ms). `wipeMs` 대진표→전투 줄무늬 전환, `vsMs` VS 카드(대진표에서 들어올 때만, 클릭·Enter·Space로 건너뜀), `sendOutMs` 흰 섬광 등장, `bannerMs` "승부!" 배너. 조작은 배너가 뜨는 순간 시작

## crowd.json — 관중석 드래프트 후보
| 키 | 뜻 |
|---|---|
| `groups` | 후보 묶음. `id`, `label`(얼리버드 / 와일드카드), `color`(이름표 색) |
| `members` | 후보 한 명. `id`(영어 소문자·숫자·밑줄), `name`(화면 이름), `groupId`. `image`에 이미지 키를 넣으면 도형 마스코트 대신 그 그림을 씀 |
| `openSlots` | 아직 정해지지 않은 일반 모집 인원 (동료 구하기 씬의 빈 슬롯 수) |
| `cheerLines` | 관중 환호 말풍선 대사. 그로기 때 1개, 장외 때 3개가 무작위로 뜸 |
| `genres` | 동료 구하기 씬에서 돌아가는 장르 태그 |

## texts.json — 화면 문구
타이틀, 메뉴, 전투 문구("따끔!", "장외!"), `cheerLines`(팀 id별 응원 대사), `endingCredits`(Day 1~4 개발 로그 줄 목록), `endingLast` 등.

전투 배너·연출 문구:

| 키 | 언제 나오나 | 기본값 |
|---|---|---|
| `vsLabel` | VS 카드 가운데 글씨 | `VS` |
| `clickToSkip` | VS 카드 아래 안내 | `클릭해서 건너뛰기` |
| `fight` | 경기 시작 노란 배너(이 순간부터 조작 가능) | `승부!` |
| `staggerText` | 그로기 노란 배너. `{name}`은 라이벌 이름, `{이/가}`는 이름 받침에 맞춰 "이"/"가"로 바뀜 | `{name}{이/가} 비틀거린다! 지금이 기회!` |
| `finishCut` | 마무리 일격 임팩트 컷(검은 화면, 라이벌 클로즈업)의 빨간 글씨. `{name}{을/를}`은 이름 받침에 맞춰 "을"/"를" | `{name}{을/를} 날려버렸다!` |
| `ultimateCall` | 필살기 컷인 띠의 작은 글씨 | `보솜보솜 필살기!` |
| `ultimateKeywords` | 상대 팀 id → 그 경기 필살기에 크게 뜨는 우리 팀 강점 키워드 하나(컷인 띠 + 가시 명판). 한 경기에 키워드 하나만 강조 | 빌드됐조 `빠른 반복`, 나가자싸우자이기자 `추진력과 소통`, GenJ `기획 공백 없음` |
| `ultimateName` | `ultimateKeywords`에 없는 팀일 때 쓰는 키워드 | `강점 합체` |
| `ko` | 라이벌이 장외로 날아간 뒤 큰 글씨. `{name}`은 라이벌 이름 | `{name} 장외!` |
| `victory` | `ko` 직후 노란 배너 | `승리!` |
| `intro` | 인트로 4컷. 컷마다 `id`(study / prize / noise / go: 그림 종류)와 `lines`(문구 줄, 마지막 줄이 노란 큰 글씨), 선택 `ms`(컷 길이) | — |
| `introSkip` | 인트로 오른쪽 아래 안내 | `클릭: 다음 · Esc: 건너뛰기` |
| `championCrowdLine` | 챔피언 씬 관중 큰 대사 | `역시 챔피언은 보솜보솜!` |
| `recruitTitle` · `recruitOpenCall` · `recruitGenreTitle` · `recruitLast` | 동료 구하기 씬 제목, 일반 모집 카드, 장르 룰렛 제목, 마지막 문구 | `이제 우리가 동료를 뽑을 차례!` 등 |
| `endingEmptySlots` | 엔딩 마지막 화면의 빈 동료 슬롯 수(숫자) | `3` |
| `crit` | "급소!" 연출 문구 (P1-1에서 사용 예정, 지금은 표시 안 됨) | `급소!` |
| `mimicPrefix` | 흉내 기술 이름 라벨 앞에 붙는 말 | `솜 버전 ` |
