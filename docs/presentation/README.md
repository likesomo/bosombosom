# 발표 덱 (쇼미더유어게임, 11/28)

- 보는 곳(최신본): https://claude.ai/artifact/GSbqvg7HXddzsto8gTEis6
- 이 폴더는 위 덱의 원본 파일 사본이다. 수정하면 해피만보가 덱에 다시 올린다.

## 구조
- `deck/deck.json` — 슬라이드 순서(`order`)와 섹션
- `deck/deck.css` — 모든 슬라이드 공통 스타일
- `deck/slides/<id>.html` — 슬라이드 한 장. 마지막 `<aside>`가 발표자 노트

## 고치는 법
- 문구·노트: 해당 `slides/<id>.html`의 글자만 고친다.
- 순서 바꾸기·삭제: `deck.json`의 `order`를 고친다.
- 이미지 `src="/_blob/..."`는 덱 서버에 올라간 그림이라 로컬에서는 보이지 않는다. 새 그림은 파일을 `docs/presentation/images/`에 넣고 어느 장 어디에 넣을지 적어 주면 된다.
- 솜님 자리: `som-game.html`, `som-work.html`의 `[ ]` 빈칸.
