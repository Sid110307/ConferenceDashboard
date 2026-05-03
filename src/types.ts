export interface WsSample {
	t: number;
	f: number;
	v: number;
	w: number;
}

export type WsEventName = "started" | "stopped" | "tared" | "cal_ok" | "cal_err";

export type WsMsg =
	| { kind: "sample"; data: WsSample }
	| { kind: "event"; name: WsEventName }
	| { kind: "connected" }
	| { kind: "disconnected" };

export interface DeviceStatus {
	recording: boolean;
	calFactor: number;
	uptime: number;
	ip: string;
	rssi: number;
	heap: number;
}

export interface Patient {
	id: number;
	pid: string;
	name: string;
	sex: "M" | "F";
	age: number;
}

export interface PendingSession {
	vv: number;
	mf: number;
	af: number;
	ft: number;
	accel: number;
	decel: number;
	sym: number;
}

export interface DiaryEntry extends PendingSession {
	id: number;
	patientId: number;
	ts: string;
	water: string;
}

export interface DiaryData {
	patients: Patient[];
	entries: DiaryEntry[];
}

export interface MetricsSnapshot {
	avgFlow: number;
	maxFlow: number;
	timeToMax: number;
	voidedVolume: number;
	flowTime: number;
	intervals: number;
	delayTime: number;
	meanAcceleration: number;
	meanDeceleration: number;
	voidingSymmetry: number;
}

export interface ChartPoint {
	t: number;
	f: number;
	v: number;
}
