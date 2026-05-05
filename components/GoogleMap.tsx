import React, { useEffect, useRef, useState } from 'react';

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers?: Array<{
    lat: number;
    lng: number;
    title?: string;
    label?: string;
    color?: string; // 'blue', 'gray', 'red', 'emerald', 'orange'
    zIndex?: number;
    scale?: number;
  }>;
  radius?: number; // in meters
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  fitToMarkers?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

// SVG Path for a standard location pin
const PIN_SVG_PATH = "M 12 2 C 8.13 2 5 5.13 5 9 c 0 5.25 7 13 7 13 s 7 -7.75 7 -13 c 0 -3.87 -3.13 -7 -7 -7 z";

export const GoogleMap: React.FC<GoogleMapProps> = ({ 
  center, 
  zoom, 
  markers = [], 
  radius, 
  onMapClick, 
  className,
  fitToMarkers = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  
  // References to keep track of map objects to clean up
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    // Load Google Maps Script
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
        // Script already exists but maybe not loaded yet? 
        const interval = setInterval(() => {
            if (window.google && window.google.maps) {
                setGoogleMapsLoaded(true);
                clearInterval(interval);
            }
        }, 100);
        return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDjkaBQ3iSL8Q0IKpgKe4Dv5OYwJNi84Ok&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (googleMapsLoaded && mapRef.current && !mapInstance) {
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true, // Allow user to zoom
        styles: [
           // Optional: Simpler map style to make pins pop
           {
             featureType: "poi",
             elementType: "labels",
             stylers: [{ visibility: "off" }]
           }
        ]
      });

      if (onMapClick) {
        map.addListener("click", (e: any) => {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        });
      }

      setMapInstance(map);
    }
  }, [googleMapsLoaded, mapInstance]);

  // Update Map Center/Zoom (Standard behavior)
  useEffect(() => {
    if (mapInstance && !fitToMarkers) {
      mapInstance.panTo(center);
      // Only set zoom manually if we aren't handling a radius fit
      if (!radius || radius <= 0) {
        mapInstance.setZoom(zoom);
      }
    }
  }, [center, zoom, mapInstance, radius, fitToMarkers]);

  // Update Markers
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Clear existing markers and info windows
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach(win => win.close());
    infoWindowsRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    // Add new markers
    markers.forEach(m => {
      // Determine color
      let fillColor = "#ea4335"; // default red
      if (m.color === 'blue') fillColor = "#2563eb"; // blue-600
      if (m.color === 'gray') fillColor = "#94a3b8"; // slate-400
      if (m.color === 'emerald') fillColor = "#059669"; // emerald-600
      if (m.color === 'red') fillColor = "#dc2626"; // red-600
      if (m.color === 'orange') fillColor = "#f97316"; // orange-500

      const icon = {
        path: PIN_SVG_PATH,
        fillColor: fillColor,
        fillOpacity: 1,
        strokeWeight: 1.5,
        strokeColor: "#ffffff",
        scale: m.scale || 1.4,
        labelOrigin: new window.google.maps.Point(12, 9),
        anchor: new window.google.maps.Point(12, 22)
      };

      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstance,
        title: m.title,
        icon: icon,
        zIndex: m.zIndex || 1,
        label: m.label ? { 
            text: m.label, 
            color: 'white', 
            fontWeight: 'bold',
            fontSize: '11px',
            className: 'map-marker-label'
        } : null,
      });
      
      if (m.title) {
          const infoWindow = new window.google.maps.InfoWindow({
              content: `<div style="font-family: system-ui; font-weight:600; color:#1e293b; padding:4px; font-size: 13px;">${m.title}</div>`,
              disableAutoPan: true
          });
          
          marker.addListener("mouseover", () => {
              infoWindow.open(mapInstance, marker);
          });
          
          marker.addListener("mouseout", () => {
              infoWindow.close();
          });
          
          infoWindowsRef.current.push(infoWindow);
      }

      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
    });

    // Fit Bounds if requested and we have markers
    if (fitToMarkers && markers.length > 0) {
        mapInstance.fitBounds(bounds);
        
        // Adjust zoom if too close (single marker) or too far
        // Use a listener for 'idle' or just a timeout to check zoom isn't crazy
        // Simple heuristic: if 1 marker, set specific zoom
        if (markers.length === 1) {
            // Google Maps fitBounds on single point zooms to max. 
            // We want context.
            const listener = window.google.maps.event.addListenerOnce(mapInstance, "bounds_changed", () => { 
                if (mapInstance.getZoom() > 15) { 
                    mapInstance.setZoom(15); 
                } 
            });
        } else {
             // For multiple markers, we might want to pad a bit? 
             // mapInstance.panToBounds(bounds) adds padding automatically usually.
        }
    }

  }, [markers, mapInstance, fitToMarkers]);

  // Update Radius Circle
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    if (radius && radius > 0) {
      const circle = new window.google.maps.Circle({
        strokeColor: "#2563eb",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        map: mapInstance,
        center: center,
        radius: radius,
        clickable: false
      });
      circleRef.current = circle;
      
      const bounds = circle.getBounds();
      if (bounds && !fitToMarkers) {
        mapInstance.fitBounds(bounds);
      }
    }
  }, [radius, center, mapInstance, fitToMarkers]);

  return (
    <div ref={mapRef} className={`w-full h-full min-h-[300px] bg-slate-100 ${className}`} />
  );
};