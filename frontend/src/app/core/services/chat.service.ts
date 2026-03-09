import { Injectable, signal, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Message } from '../models/chat.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  // Use 'inject' at the top of the class for a cleaner look
  private authService = inject(AuthService);
  private hubConnection?: HubConnection;
  
  messageThread = signal<Message[]>([]);

  // Keep the constructor empty or remove it if you aren't using it
  constructor() {}

 createHubConnection(otherUsername: string) {
    const user = this.authService.currentUser();
    // 1. Guard clause to ensure user and token exist
    if (!user || !user.token) return;

    // 2. Capture the token in a constant to prove to TS it's a string
    const token = user.token;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`http://localhost:5062/hubs/chat?user=${otherUsername}`, {
        accessTokenFactory: () => token // Now TS knows this is 100% a string
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch(error => console.log(error));

  }

  stopHubConnection() {
    this.hubConnection?.stop().catch(error => console.log(error));
    this.messageThread.set([]);
  }

  async sendMessage(recipientUsername: string, content: string) {
    return this.hubConnection?.invoke('SendMessage', {
      recipientUsername,
      content
    }).catch(error => console.log(error));
  }
}