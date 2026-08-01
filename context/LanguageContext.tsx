"use client";

import { createContext, useContext } from "react";
import type { InterfaceLanguage } from "@/types/tasks";

const LanguageContext = createContext<InterfaceLanguage>("zh-CN");

export function LanguageProvider({
  language,
  children,
}: {
  language: InterfaceLanguage;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const language = useContext(LanguageContext);
  return {
    language,
    isEnglish: language === "en",
    tr: (chinese: string, english: string) =>
      language === "en" ? english : chinese,
  };
}
