# 🏡 시골집 아지트 v3 — 미니어처 디오라마

실제 시골집 사진 4장(ㄱ자 크림색 집, 밤색 지붕, 초록 기둥 처마, 대나무 돗자리 마루, 노란 미닫이문, 강아지 셋)을 바탕으로 다시 만든 3D 공간.
동물의 숲·지브리 미니어처 같은 말랑한 정원 상자 스타일 (둥근 모서리, 파스텔 크림 우드 톤, 오후 4시 햇살 + 부드러운 그림자).
React + Vite + React Three Fiber. 소리는 모두 Web Audio로 직접 합성해서 mp3 파일이 없어요.

```bash
npm install
npm run dev      # 같은 와이파이의 핸드폰에서도 주소로 접속 가능 (host: true)
npm run build
```

## 조작
- 바닥 탭 / WASD·방향키: 이동 (문·방은 알아서 길 찾아감)
- 화면 드래그: 둘러보기 · V: 시점 전환
- 오른쪽 위 ☀️/🌧️ 버튼: 맑은 오후 ↔ 비 오는 저녁
- 사물·가족·강아지 터치: 멀리 있으면 걸어가서 반응

## 구조
- `src/store.js` : 상태, 집 치수, 충돌, 문, 길찾기, 터치 처리, 편지·대사
- `src/audio/AsmrEngine.js` : 빗소리·찌개·주전자 + 효과음 합성
- `src/scene/parts.jsx` : 둥근 박스/원기둥/캡슐 + 파스텔 필터(soft)
- `src/scene/Scene.jsx` : 3점 조명, 그림자, 날씨 전환
- `src/scene/House.jsx` : 본채(우진각 지붕·福), 창고채, 처마, 유리 샷시, 노란 미닫이문, 벽 자동 투명
- `src/scene/Living.jsx` · `Kitchen.jsx` · `BackRoom.jsx` · `Yard.jsx` : 공간별 소품과 인터랙션
- `src/scene/Character.jsx` : 주인공·엄마·아빠 / `Dogs.jsx` : 푸들·누렁이·백구 / `Fx.jsx` : 말풍선·하트·김
