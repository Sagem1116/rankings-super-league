// @ts-nocheck
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useFMStore } from "@/lib/store";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface CountryData {
  country: string;
  lat: number;
  lng: number;
  topClubs: string[];
  topPlayers: string[];
}

export function WorldMap() {
  const { resultados } = useFMStore();
  const [countryData, setCountryData] = useState<CountryData[]>([]);

  useEffect(() => {
    // Process data to get top clubs/players by country
    const countries: Record<string, { clubs: string[], players: string[] }> = {};

    // Assuming we have rankings data
    const clubRanking = resultados["ranking-clubes"]?.rows || [];
    const playerRanking = resultados["ranking-jogadores"]?.rows || [];

    // Get top 5 clubs per country
    clubRanking.slice(0, 50).forEach((row) => {
      const country = row["País"] as string;
      const club = row["Equipa"] as string;
      if (country && club) {
        if (!countries[country]) countries[country] = { clubs: [], players: [] };
        if (countries[country].clubs.length < 5) countries[country].clubs.push(club);
      }
    });

    // Get top 5 players per country
    playerRanking.slice(0, 50).forEach((row) => {
      const country = row["País"] as string;
      const player = row["Jogador"] as string;
      if (country && player) {
        if (!countries[country]) countries[country] = { clubs: [], players: [] };
        if (countries[country].players.length < 5) countries[country].players.push(player);
      }
    });

    // Mock coordinates for countries (in real app, use a geocoding service)
    const countryCoords: Record<string, [number, number]> = {
      "Portugal": [39.3999, -8.2245],
      "Espanha": [40.4637, -3.7492],
      "Inglaterra": [52.3555, -1.1743],
      "França": [46.2276, 2.2137],
      "Alemanha": [51.1657, 10.4515],
      "Itália": [41.8719, 12.5674],
      "Brasil": [-14.2350, -51.9253],
      "Argentina": [-38.4161, -63.6167],
      // Add more as needed
    };

    const data: CountryData[] = Object.entries(countries).map(([country, data]) => ({
      country,
      lat: countryCoords[country]?.[0] || 0,
      lng: countryCoords[country]?.[1] || 0,
      topClubs: data.clubs,
      topPlayers: data.players,
    })).filter(d => d.lat && d.lng);

    setCountryData(data);
  }, [resultados]);

  return (
    <div className="h-[600px] w-full">
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {countryData.map((data, index) => (
          <Marker key={index} position={[data.lat, data.lng]}>
            <Popup>
              <div>
                <h3 className="font-bold">{data.country}</h3>
                {data.topClubs.length > 0 && (
                  <div>
                    <h4>Top Clubes:</h4>
                    <ul>
                      {data.topClubs.map((club, i) => <li key={i}>{club}</li>)}
                    </ul>
                  </div>
                )}
                {data.topPlayers.length > 0 && (
                  <div>
                    <h4>Top Jogadores:</h4>
                    <ul>
                      {data.topPlayers.map((player, i) => <li key={i}>{player}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}