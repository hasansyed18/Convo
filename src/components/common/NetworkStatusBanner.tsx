import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { offlineStorageService } from "../../services/offlineStorageService";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = offlineStorageService.addNetworkListener((online) => {
      setIsOnline(online);
    });
    return unsub;
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-600/95 text-black px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md sticky top-0 z-50">
      <WifiOff size={15} />
      <span>
        Offline Mode Active: Local camera gesture recognition, sign avatar, and speech translation remain 100% operational.
      </span>
    </div>
  );
}
