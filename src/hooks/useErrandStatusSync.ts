import { useEffect, useState } from 'react';
import { Errand, ErrandStatus } from '../../types';
import { firebaseService } from '../services/firebaseService';

/**
 * useErrandStatusSync
 * 
 * A specialized hook that subscribes to a specific errand's status updates.
 * It provides the real-time errand object and a 'hasAdvanced' flag that
 * triggers when a status change is detected, useful for UI animations.
 */
export function useErrandStatusSync(errandId: string | undefined, initialErrand: Errand) {
  const [syncedErrand, setSyncedErrand] = useState<Errand>(initialErrand);
  const [lastStatus, setLastStatus] = useState<ErrandStatus>(initialErrand.status);
  const [hasAdvanced, setHasAdvanced] = useState(false);

  useEffect(() => {
    if (!errandId) return;

    // Direct subscription to this specific errand for higher frequency/reliability in detail view
    const unsubscribe = firebaseService.subscribeToErrandById(errandId, (updatedErrand) => {
      if (updatedErrand) {
        // Detect status change
        if (updatedErrand.status !== lastStatus) {
          console.log(`[useErrandStatusSync] Status shift detected: ${lastStatus} -> ${updatedErrand.status}`);
          setHasAdvanced(true);
          
          // Flash the 'advanced' state briefly to trigger animations
          setTimeout(() => setHasAdvanced(false), 2000);
          setLastStatus(updatedErrand.status);
        }
        setSyncedErrand(updatedErrand);
      }
    });

    return () => unsubscribe();
  }, [errandId, lastStatus]);

  return { syncedErrand, hasAdvanced };
}
