import { EventBus } from "../../bus.events/event-bus";
import type { AudiobookshelfApi } from ".";
import type { SocketEventMap } from "../interfaces/ws";

export type SocketEventNames = {
	playback: string;
	mediaProgress: string;
	device: string;
	library: string;
	serverStatus: string;
};

export type SocketOptions = {
	path?: string;
	eventNames?: Partial<SocketEventNames>;
};

export enum SocketMessageTypes {
	EnginePing = "2",
	EnginePong = "3",
	EngineOpen = "0",
	SocketConnect = "40",
	SocketEvent = "42",
}

const defaultEventNames: SocketEventNames = {
	playback: "playback",
	mediaProgress: "mediaProgress",
	device: "device",
	library: "library",
	serverStatus: "serverStatus",
};

export class AudiobookshelfSocket {
	private _api: AudiobookshelfApi;
	private _socket: WebSocket | null;
	private _events = new EventBus<SocketEventMap>();
	private _eventNames: SocketEventNames;
	private _path: string;

	public on = this._events.on.bind(this._events);

	constructor(api: AudiobookshelfApi, options?: SocketOptions) {
		this._api = api;
		this._socket = null;
		this._eventNames = { ...defaultEventNames, ...options?.eventNames };
		this._path = options?.path ?? "/audiobookshelf/socket.io/";
	}

	connect() {
		if (this._socket && this._socket.readyState <= WebSocket.OPEN) {
			return;
		}

		const url = this.buildSocketUrl();
		if (!url) {
			this._events.emit("error", { message: "Missing base URL" });
			return;
		}

		this._socket = new WebSocket(url);

		this._socket.addEventListener("open", () => {
			// Engine.IO handshake will send a 0 packet; wait for it.
		});

		this._socket.addEventListener("message", (event) => {
			if (typeof event.data !== "string") {
				return;
			}
			this.handleMessage(event.data);
		});

		this._socket.addEventListener("close", (event) => {
			this._events.emit("disconnected", { code: event.code, reason: event.reason });
		});

		this._socket.addEventListener("error", () => {
			this._events.emit("error", { message: "WebSocket error" });
		});
	}

	disconnect() {
		if (this._socket) {
			this._socket.close();
			this._socket = null;
		}
	}

	sendPlayback(state: SocketEventMap["playback"]) {
		this.emit(this._eventNames.playback, state);
	}

	sendMediaProgress(update: SocketEventMap["mediaProgress"]) {
		this.emit(this._eventNames.mediaProgress, update);
	}

	sendDevicePresence(update: SocketEventMap["device"]) {
		this.emit(this._eventNames.device, update);
	}

	sendLibraryUpdate(update: SocketEventMap["library"]) {
		this.emit(this._eventNames.library, update);
	}

	sendServerStatus(update: SocketEventMap["serverStatus"]) {
		this.emit(this._eventNames.serverStatus, update);
	}

	private emit(eventName: string, data: unknown) {
		if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
			return;
		}
		const payload = `${SocketMessageTypes.SocketEvent}${JSON.stringify([eventName, data])}`;
		this._socket.send(payload);
	}

	private handleMessage(message: string) {
		if (message === SocketMessageTypes.EnginePing) {
			this._socket?.send(SocketMessageTypes.EnginePong);
			return;
		}

		if (message.startsWith(SocketMessageTypes.EngineOpen)) {
			// Engine.IO open packet
			this._socket?.send(SocketMessageTypes.SocketConnect);
			return;
		}

		if (message.startsWith(SocketMessageTypes.SocketConnect)) {
			this._events.emit("connected", undefined);
			return;
		}

		if (message.startsWith(SocketMessageTypes.SocketEvent)) {
			const raw = message.slice(SocketMessageTypes.SocketEvent.length);
			try {
				const [eventName, data] = JSON.parse(raw);
				this._events.emit("raw", { event: eventName, data });
				this.routeEvent(eventName, data);
			} catch (error) {
				this._events.emit("error", { message: "Failed to parse socket message" });
			}
		}
	}

	private routeEvent(eventName: string, data: unknown) {
		switch (eventName) {
			case this._eventNames.playback:
				this._events.emit("playback", data as SocketEventMap["playback"]);
				break;
			case this._eventNames.mediaProgress:
				this._events.emit("mediaProgress", data as SocketEventMap["mediaProgress"]);
				break;
			case this._eventNames.device:
				this._events.emit("device", data as SocketEventMap["device"]);
				break;
			case this._eventNames.library:
				this._events.emit("library", data as SocketEventMap["library"]);
				break;
			case this._eventNames.serverStatus:
				this._events.emit("serverStatus", data as SocketEventMap["serverStatus"]);
				break;
		}
	}

	private buildSocketUrl(): string | null {
		const baseUrl = this._api.getBaseUrl();
		if (!baseUrl) {
			return null;
		}
		const token = this._api.getAccessToken();
		const url = new URL(baseUrl);
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
		url.pathname = this._path.startsWith("/") ? this._path : `/${this._path}`;
		url.searchParams.set("EIO", "4");
		url.searchParams.set("transport", "websocket");
		if (token) {
			url.searchParams.set("token", token);
		}
		return url.toString();
	}
}
