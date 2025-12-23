'use client';

import { useState } from 'react';
import DetectorZonaHoraria from './DetectorZonaHoraria';

interface TimezoneWrapperProps {
  initialTimezone: string;
}

export default function TimezoneWrapper({ initialTimezone }: TimezoneWrapperProps) {
  const [timezone, setTimezone] = useState(initialTimezone);

  return (
    <DetectorZonaHoraria 
      userTimezone={timezone} 
      onUpdateConfirm={setTimezone}
    />
  );
}
