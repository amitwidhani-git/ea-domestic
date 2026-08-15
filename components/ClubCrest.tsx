"use client";
import { useState } from "react";

interface Props {
  apiFootballId: number | null;
  clubName: string;
  size?: number;
}

export default function ClubCrest({ apiFootballId, clubName, size = 24 }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed || apiFootballId == null) {
    return (
      <div
        role="img"
        aria-label={clubName}
        title={clubName}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.4) }}
        className="inline-flex flex-shrink-0 items-center justify-center border border-line bg-panel font-data uppercase leading-none tracking-tighter text-ink"
      >
        {clubName.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={`https://media.api-sports.io/football/teams/${apiFootballId}.png`}
      alt={clubName}
      title={clubName}
      width={size}
      height={size}
      loading="lazy"
      className="inline-block flex-shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
