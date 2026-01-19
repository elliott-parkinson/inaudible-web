

export enum WorkerMesssageType {
    REQUEST = "REQUEST",
    RESPONSE = "RESPONSE",
    EVENT = "EVENT",
    ERROR = "ERROR",
    INIT_PORT = "INIT_PORT",
}

export interface WorkerMessage<T = any> {
  type: WorkerMesssageType;
  path: string;
  payload: T;
}


export class Bus {
  port: MessagePort;

  constructor () {
    this.init();
  }

  private init() {
    self.addEventListener("message", (event) => {
      if (event.data?.type === "INIT_PORT" && event.ports?.[0]) {
        return this.handdlePortInit(event);
      }
    });
  }

  private handdlePortInit(event: MessageEvent) {
    this.port = event.ports[0];

    this.port.onmessage = (e) => this.handleMessage(e.data);
    this.port.start();

    this.port.postMessage({ type: "READY" });
    return;
  }

  private handleMessage(message: WorkerMessage) {

  }


  event<T>(path: string, message: T) {
    this.port.postMessage({
      path: path,
      type: WorkerMesssageType.EVENT,
      payload: message
    } as WorkerMessage<T>);
  }

  request<T>(path: string, message: T) {
    this.port.postMessage({
      path: path,
      type: WorkerMesssageType.REQUEST,
      payload: message
    } as WorkerMessage<T>);
  }

  respond<T>(path: string, message: T) {
    this.port.postMessage({
      path: path,
      type: WorkerMesssageType.RESPONSE,
      payload: message
    } as WorkerMessage<T>);
  }


}