import { useEffect } from "react";
import { useLocation } from "wouter";

const GA_MEASUREMENT_ID = "G-M0RRDP4JVM";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function initializeAnalytics() {
  if (typeof window === "undefined") return;

  try {
    if (window.dataLayer) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.warn("[Analytics] Failed to load Google Tag Manager script");
    };
    document.head.appendChild(script);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[Analytics] Initialization failed", error);
  }
}

export function Analytics() {
  const [location] = useLocation();

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    if (!window.gtag) return;

    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: location,
    });
  }, [location]);

  return null;
}
