declare module 'roslib' {
  export class Ros {
    constructor(options: { url: string });
    on(event: string, callback: (data?: any) => void): void;
    close(): void;
  }

  export class Topic {
    constructor(options: { ros: Ros; name: string; messageType: string });
    publish(message: Message): void;
  }

  export class Message {
    constructor(values: any);
  }

  export class Service {
    constructor(options: { ros: Ros; name: string; serviceType: string });
    callService(request: ServiceRequest, successCallback: (result: any) => void, errorCallback: (error: any) => void): void;
  }

  export class ServiceRequest {
    constructor(values?: any);
  }
}