export type Listener<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, any>> {
	private listeners: { [K in keyof Events]?: Listener<Events[K]>[] } = {};

	on<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
		(this.listeners[event] ??= []).push(listener);
	}

	emit<K extends keyof Events>(event: K, payload: Events[K]) {
		this.listeners[event]?.forEach((l) => l(payload));
	}
}
