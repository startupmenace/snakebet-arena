import { io, Socket } from 'socket.io-client';

declare module 'socket.io-client' {
  export interface Socket {
    emit(event: string, data?: any): Socket;
    on(event: string, callback: (data: any) => void): Socket;
    off(event: string): Socket;
    disconnect(): Socket;
  }
}

export { io, Socket };
