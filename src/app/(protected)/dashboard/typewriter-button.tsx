"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button"; // shadcn/ui button

const FloatingTypewriterButton: React.FC = () => {
  const phrases = [
    "Generate a Web App",
    "Create a UI Component",
    "Prototype Ideas",
    "Build with AI",
  ];

  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    const type = () => {
      if (isDeleting) {
        setDisplayText((prev) => prev.slice(0, -1));
      } else {
        setDisplayText(currentPhrase!.slice(0, displayText.length + 1));
      }

      let timeout = isDeleting ? 100 : 150;

      if (!isDeleting && displayText === currentPhrase) {
        timeout = 2000;
        setIsDeleting(true);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        timeout = 500;
      }

      timeoutRef.current = setTimeout(type, timeout);
    };

    timeoutRef.current = setTimeout(type, isDeleting ? 80 : 150);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <div className="fixed bottom-6 right-6">
      <Button
        className="min-w-[300px] min-h-[48px] font-mono text-base font-medium relative hover:cursor-pointer"
        onClick={() => window.open("https://tinyurl.com/chattpr", "_blank")}
      >
        {displayText || "\u00A0"}
        <span className="ml-2 animate-pulse">▋</span>
      </Button>
    </div>
  );
};

export default FloatingTypewriterButton;
