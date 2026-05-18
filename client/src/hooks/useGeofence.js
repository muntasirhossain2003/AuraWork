import { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';

export default function useGeofence(zones = [], onZoneChange) {
  const [currentZone, setCurrentZone] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const previousZoneRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });

        const point = turf.point([longitude, latitude]);
        let matched = null;
        for (const zone of zones) {
          // turf.circle takes center [lng, lat] and radius in km
          const circle = turf.circle([zone.longitude, zone.latitude], zone.radius_m / 1000, { units: 'kilometers' });
          if (turf.booleanPointInPolygon(point, circle)) {
            matched = zone;
            break;
          }
        }

        if (matched?.id !== previousZoneRef.current?.id) {
          onZoneChange?.(matched, previousZoneRef.current);
          previousZoneRef.current = matched;
          setCurrentZone(matched);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [zones, onZoneChange]);

  return { currentZone, coordinates, permissionDenied };
}
