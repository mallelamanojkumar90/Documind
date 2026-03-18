"use client";

import ConvexClientProvider from "../components/ConvexClientProvider";
import { PDFQaApp } from "../components/PDFQaApp";

export default function Home() {
  return (
    <ConvexClientProvider>
      <PDFQaApp />
    </ConvexClientProvider>
  );
}
