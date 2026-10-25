import { useEffect } from "react";
import { startPwa } from "@/lib/pwa";

/** Registers the service worker and listens for the "install" offer of the browser. */
export function PwaRegister() {
  useEffect(() => {
    startPwa();
  }, []);
  return null;
}
