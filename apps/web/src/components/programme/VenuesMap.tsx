import React from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "leaflet/dist/leaflet.css";

import { Expand } from "lucide-react";

import { Button } from "@/components/Button";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

type VenueMapItem = {
	id: string;
	name: string;
	description?: string;
	location?: string | null;
};

type Props = {
	venues: VenueMapItem[];
	activeVenueId: string | null;
	editable: boolean;
	locationValue?: string | null;
	onLocationChange: (location: string) => void;
	onEditVenue: (venueId: string) => void;
	enableMarkerClick?: boolean;
	onMarkerClick?: (venueId: string) => void;
	onCenterMarkerConfirm?: () => void;
	onCenterMarkerCancel?: () => void;
};

export function parseLocation(loc?: string | null): [number, number] | null {
	if (!loc) return null;
	const m = loc.trim().match(/^\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*$/);
	if (!m) return null;

	const lat = Number(m[1]);
	const lng = Number(m[2]);

	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return [lat, lng];
}

function formatLocation([lat, lng]: [number, number]): string {
	return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function MapCenter({ onCenterChange }: { onCenterChange: (center: [number, number]) => void }) {
	const map = useMap();

	React.useEffect(() => {
		const handleMapMove = () => {
			const center = map.getCenter();
			onCenterChange([center.lat, center.lng]);
		};

		map.on("moveend", handleMapMove);
		const center = map.getCenter();
		onCenterChange([center.lat, center.lng]);

		return () => {
			map.off("moveend", handleMapMove);
		};
	}, [map, onCenterChange]);

	return null;
}

function CenterMarker({
	position,
	enabled,
	onChange,
}: {
	position: [number, number];
	enabled: boolean;
	onChange: (coords: [number, number]) => void;
}) {
	return (
		<Marker
			position={position}
			draggable={enabled}
			eventHandlers={{
				dragend: (e: any) => {
					const p = e.target.getLatLng();
					onChange([p.lat, p.lng]);
				},
			}}
		></Marker>
	);
}

function ClickToSet({
	enabled,
	onSelect,
}: {
	enabled: boolean;
	onSelect: (coords: [number, number]) => void;
}) {
	useMapEvents({
		click: e => {
			if (!enabled) return;
			onSelect([e.latlng.lat, e.latlng.lng]);
		},
	});
	return null;
}

function DraggableMarker({
	position,
	enabled,
	onChange,
}: {
	position: [number, number];
	enabled: boolean;
	onChange: (coords: [number, number]) => void;
}) {
	return (
		<Marker
			position={position}
			draggable={enabled}
			eventHandlers={{
				dragend: (e: any) => {
					const p = e.target.getLatLng();
					onChange([p.lat, p.lng]);
				},
			}}
		/>
	);
}

function MapRef({ mapRef }: { mapRef: React.RefObject<L.Map | null> }) {
	const map = useMap();

	React.useEffect(() => {
		mapRef.current = map;

		return () => {
			if (mapRef.current === map) {
				mapRef.current = null;
			}
		};
	}, [map, mapRef]);

	return null;
}

export function VenuesMap({
	venues,
	activeVenueId,
	editable,
	locationValue,
	onLocationChange,
	onEditVenue,
	enableMarkerClick,
	onMarkerClick,
	onCenterMarkerConfirm,
	onCenterMarkerCancel,
}: Props) {
	const mapRef = React.useRef<L.Map | null>(null);

	const coordsList = React.useMemo(
		() =>
			venues
				.map(v => ({ venue: v, coords: parseLocation(v.location) }))
				.filter(v => v.coords),
		[venues],
	);

	const activeVenue = React.useMemo(
		() => venues.find(v => v.id === activeVenueId) ?? null,
		[venues, activeVenueId],
	);

	const defaultCenter: [number, number] = coordsList[0]?.coords ?? [20.59, 78.96];
	const initialDraftCoords = React.useMemo(
		() => parseLocation(locationValue) ?? parseLocation(activeVenue?.location),
		[locationValue, activeVenue?.location],
	);
	const [draftCoords, setDraftCoords] = React.useState<[number, number] | null>(
		initialDraftCoords,
	);
	const [mapCenter, setMapCenter] = React.useState<[number, number]>(defaultCenter);
	const [selectionCoords, setSelectionCoords] = React.useState<[number, number]>(defaultCenter);

	React.useEffect(() => {
		const parsed = parseLocation(locationValue);
		setDraftCoords(parsed);
	}, [locationValue]);

	React.useEffect(() => {
		if (enableMarkerClick && !draftCoords) {
			setSelectionCoords(mapCenter);
		}
	}, [enableMarkerClick, draftCoords, mapCenter]);

	React.useEffect(() => {
		if (!mapRef.current || !activeVenue) return;
		const target = parseLocation(locationValue) ?? parseLocation(activeVenue.location);
		if (!target) return;
		mapRef.current.setView(target, Math.max(mapRef.current.getZoom(), 16), { animate: true });
	}, [activeVenueId, activeVenue, locationValue]);

	const handleCoordsChange = (coords: [number, number]) => {
		setDraftCoords(coords);
		onLocationChange(formatLocation(coords));
	};

	const zoomToFit = () => {
		if (!mapRef.current) return;
		const points = coordsList.map(v => v.coords as [number, number]);
		if (draftCoords) points.push(draftCoords);
		if (points.length === 0) return;
		if (points.length === 1) {
			const point = points[0];
			if (!point) return;
			mapRef.current.setView(point, 16, { animate: true });
			return;
		}
		const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
		mapRef.current.fitBounds(bounds.pad(0.2), { animate: true });
	};

	return (
		<div className="w-full h-128 rounded border overflow-hidden relative">
			<MapContainer
				key={activeVenueId ?? "default"}
				center={parseLocation(locationValue) ?? defaultCenter}
				zoom={13}
				className="w-full h-full rounded z-0"
			>
				<MapRef mapRef={mapRef} />
				<MapCenter onCenterChange={setMapCenter} />
				<TileLayer
					url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
					maxNativeZoom={19}
					maxZoom={22}
				/>
				<TileLayer
					url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
					opacity={0.75}
					maxNativeZoom={19}
					maxZoom={22}
				/>
				{coordsList.map(({ venue, coords }) => (
					<Marker
						key={venue.id}
						position={coords as [number, number]}
						eventHandlers={
							enableMarkerClick
								? {
										click: () => {
											if (onMarkerClick) {
												onMarkerClick(venue.id);
											}
										},
									}
								: undefined
						}
					>
						<Popup>
							<div className="text-sm font-medium">{venue.name}</div>
							{venue.description && (
								<div className="text-xs mb-2">{venue.description}</div>
							)}
							{editable && (
								<Button
									size="sm"
									variant="secondary"
									onClick={() => onEditVenue(venue.id)}
								>
									Edit Location
								</Button>
							)}
						</Popup>
					</Marker>
				))}
				<ClickToSet enabled={editable} onSelect={handleCoordsChange} />
				{enableMarkerClick && !draftCoords && (
					<CenterMarker
						position={selectionCoords}
						enabled={true}
						onChange={setSelectionCoords}
					/>
				)}
				{editable && draftCoords && (
					<DraggableMarker
						position={draftCoords}
						enabled={editable}
						onChange={handleCoordsChange}
					/>
				)}
			</MapContainer>
			{enableMarkerClick && !draftCoords && (
				<div className="absolute bottom-2 left-2 z-10 bg-white bg-opacity-90 rounded p-2 shadow">
					<div className="text-xs font-medium text-ink-2">Selected coordinates</div>
					<div className="mt-1 text-sm font-mono text-ink">
						{selectionCoords[0].toFixed(6)}, {selectionCoords[1].toFixed(6)}
					</div>
					<div className="mt-2 flex gap-2">
						<Button
							size="xs"
							variant="primary"
							onClick={() => {
								handleCoordsChange(selectionCoords);
								onCenterMarkerConfirm?.();
							}}
						>
							Confirm
						</Button>
						<Button size="xs" variant="ghost" onClick={() => onCenterMarkerCancel?.()}>
							Cancel
						</Button>
					</div>
				</div>
			)}
			<div className="absolute right-2 top-2 z-10">
				<Button
					size="sm"
					variant="secondary"
					onClick={zoomToFit}
					leadingIcon={<Expand size={14} />}
				>
					Zoom To Fit
				</Button>
			</div>
		</div>
	);
}
