// Style reminder: error pages inherit the K.A Juniors charcoal canvas and Arabic document direction.

import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ar" dir="rtl">
      <Head>
        <meta name="theme-color" content="#08080a" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
