"use client";

import dynamic from "next/dynamic";

const EMDRApp = dynamic(() => import("@/components/EMDRApp"), { ssr: false });

export default function Home() {
  return <EMDRApp />;
}
