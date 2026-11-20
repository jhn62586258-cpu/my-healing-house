# 🏡 시골집 아지트 : 나만의 힐링의 존

React + Vite + React Three Fiber, 사운드는 전부 Web Audio API 합성 (mp3/이미지/DB 없음).

```bash
npm install
npm run dev
```

## 조작
- WASD / 방향키 / 바닥 클릭: 이동
- 화면 드래그 / Q·E: 시선(1인칭) · 카메라(3인칭) 회전
- V: 시점 전환 · H: UI 숨기기(멍때리기)
- 반짝이는 물건 클릭/드래그: ASMR

## 구조
- `src/store.js` : 전역 상태, 월드 상태, 충돌 박스
- `src/audio/AsmrEngine.js` : 노이즈 기반 사운드 합성
- `src/scene/*` : 캐릭터, 집, 3개 존, 비 파티클
- `src/ui/UI.jsx` : 글래스모피즘 UI
