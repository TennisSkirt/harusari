# 하루살이

호보니치 감성의 데일리 플래너 PWA (맥 · 아이폰).

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (dist/)
```

`main` 브랜치에 푸시하면 GitHub Actions가 GitHub Pages로 배포합니다.

## 구조

- `src/lib/db.ts` — IndexedDB(Dexie) 저장소. 동기화를 위해 모든 레코드에 `id`, `updatedAt`, `deleted`를 둠
- `src/lib/settings.ts` — 테마·글꼴·타임라인 설정
- `src/pages/TodayPage.tsx` — 오늘(데일리) 페이지
