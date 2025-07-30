"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  const [result, setResult] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(inputValue);
    inputRef.current?.focus();
    setResult("복사되었습니다.");
  };

  const handleLocalNotification = async () => {
    try {
      // 1. 알림 권한 요청
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        // 2. 알림 생성
        new Notification("WebView 알림", {
          body: "이것은 WebView에서 보낸 알림입니다!",
          tag: "webview-notification", // 같은 태그의 알림은 대체됨
          requireInteraction: false, // 사용자가 직접 닫을 때까지 유지
        });
        setResult("알림을 보낼 수 있습니다.");
      } else {
        alert("알림 권한이 거부되었습니다.");
        setResult("알림 권한이 거부되었습니다.");
      }
    } catch (error) {
      alert("알림을 보낼 수 없습니다.");
      setResult(`알림을 보낼 수 없습니다. ${error}`);
    }
  };

  const handleLocalMessage = () => {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "message",
        message: inputValue,
      } as { type: string; message: string })
    );
    setResult("메시지를 보냈습니다.");
  };

  const handleOpenShareSheet = () => {
    navigator.share({
      title: "WebView 알림",
      text: "이것은 WebView에서 보낸 알림입니다!",
      url: "https://www.naver.com",
    });
  };

  useEffect(() => {
    if (result !== "") {
      setTimeout(() => {
        setResult("");
      }, 3000);
    }
  }, [result]);

  return (
    <div className="flex flex-col min-h-screen min-w-screen items-center justify-center px-12 gap-4">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <Button onClick={handleCopy}>Copy</Button>
      <Button onClick={handleLocalNotification}>Local Push Notification</Button>
      <Button onClick={handleLocalMessage}>Local Message</Button>
      <Button onClick={handleOpenShareSheet}>Share for Sheet</Button>
      <Button onClick={() => router.push("/second")}>Go SecondPage</Button>
      {result && <div className="absolute">{result}</div>}
    </div>
  );
}
