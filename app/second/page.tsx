"use client";

import Button from "@/components/Button";
import { useRouter } from "next/navigation";
import React from "react";

export default function SecondPage() {
  const router = useRouter();
  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <Button onClick={() => router.back()}>Go Back</Button>
    </main>
  );
}
