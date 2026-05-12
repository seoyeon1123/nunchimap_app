import { ScrollViewStyleReset } from 'expo-router/html';

// expo-router 의 web static rendering 용 루트 HTML.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>NUNCHIMAP — 카공하기 좋은 카페, 한눈에</title>
        <meta
          name="description"
          content="실시간 신호로 카페 분위기를 미리 확인하고 내 취향에 맞는 자리를 찾아보세요."
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body { background-color: #F7F7F8; }
@media (prefers-color-scheme: dark) {
  body { background-color: #0B0B0E; }
}`;
