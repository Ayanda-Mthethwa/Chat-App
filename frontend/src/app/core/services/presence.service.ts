import { Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

export interface OnlineUser {
  id: number;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private hubConnection?: HubConnection;
  
  onlineUsers = signal<OnlineUser[]>([]);
  hubConnected = signal<boolean>(false);
  signalReceived = signal<{ sender: string, data: any } | null>(null);
  typingUsers = signal<string[]>([]);

  createHubConnection(token: string) {
    // Prevent creating a new connection if one already exists.
    if (this.hubConnection) return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/presence`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch((error: any) => console.log(error));

    // Listen for the initial list of online users
    this.hubConnection.on('GetOnlineUsers', (users: OnlineUser[]) => {
      this.onlineUsers.set(users);
      this.hubConnected.set(true);
    });

    // Listen for the "UserIsOnline" event
    this.hubConnection.on('UserIsOnline', (user: OnlineUser) => {
      this.onlineUsers.update(users => {
        // Avoid duplicates if the event is somehow received multiple times
        if (users.some(u => u.id === user.id)) return users;
        return [...users, user];
      });
    });

    // Listen for the "UserIsOffline" event
    this.hubConnection.on('UserIsOffline', (userId: string) => {
      const idAsNumber = +userId;
      // Update the signal value by filtering out the user
      this.onlineUsers.update(users => users.filter(u => u.id !== idAsNumber));
    });

    // Listen for Typing events
    this.hubConnection.on('UserIsTyping', (username: string) => {
      this.typingUsers.update(users => [...new Set([...users, username])]);
    });

    this.hubConnection.on('UserStoppedTyping', (username: string) => {
      this.typingUsers.update(users => users.filter(u => u !== username));
    });

    // Listen for WebRTC signals
    this.hubConnection.on('NewSignal', (sender: string, data: any) => {
      this.signalReceived.set({ sender, data });
    });
  }

  stopHubConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(error => console.log(error));
      this.hubConnection = undefined;
      this.onlineUsers.set([]);
      this.hubConnected.set(false);
    }
  }

  async sendSignal(toUsername: string, signalData: any) {
    return this.hubConnection?.invoke('SendSignal', toUsername, signalData);
  }

  async userTyping(toUsername: string) {
    return this.hubConnection?.invoke('UserTyping', toUsername);
  }

  async userStoppedTyping(toUsername: string) {
    return this.hubConnection?.invoke('UserStoppedTyping', toUsername);
  }
}