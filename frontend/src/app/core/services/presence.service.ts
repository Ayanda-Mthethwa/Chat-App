import { Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private hubConnection?: HubConnection;
  
  // Replaced BehaviorSubject with a Signal
  onlineUsers = signal<number[]>([]);

  createHubConnection(token: string) {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl('http://localhost:5062/hubs/presence', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch((error: any) => console.log(error));

    // Listen for the "UserIsOnline" event
    this.hubConnection.on('UserIsOnline', (userId: string) => {
      const idAsNumber = +userId;
      // Update the signal value
      this.onlineUsers.update(users => {
        if (!users.includes(idAsNumber)) return [...users, idAsNumber];
        return users;
      });
    });

    // Listen for the "UserIsOffline" event
    this.hubConnection.on('UserIsOffline', (userId: string) => {
      const idAsNumber = +userId;
      // Update the signal value by filtering out the user
      this.onlineUsers.update(users => users.filter(id => id !== idAsNumber));
    });
  }

  stopHubConnection() {
    this.hubConnection?.stop().catch(error => console.log(error));
  }
}