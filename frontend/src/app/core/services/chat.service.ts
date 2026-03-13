import { Injectable, signal, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Message } from '../models/chat.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private authService = inject(AuthService);
  private hubConnection?: HubConnection;

  messageThread = signal<Message[]>([]);
  connectionEstablished = signal<boolean>(false);

  createHubConnection(otherUsername: string) {
    const user = this.authService.currentUser();
    if (!user || !user.token) return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`http://localhost:5062/hubs/chat?user=${otherUsername}`, {
        accessTokenFactory: () => user.token!
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => {
        this.connectionEstablished.set(true);
      })
      .catch(error => {
        console.log('Connection error: ', error);
        this.connectionEstablished.set(false);
      });

    this.hubConnection.on('NewMessage', (message: Message) => {
      this.messageThread.update(messages => [...messages, message]);
    });

    this.hubConnection.on('ReceiveMessageThread', (messages: Message[]) => {
      this.messageThread.set(messages);
    });

    // When recipient opens the chat — mark all our sent messages as read
    this.hubConnection.on('MessagesRead', (data: { reader: string; dateRead: Date }) => {
      this.messageThread.update(messages =>
        messages.map(m =>
          m.senderUsername !== data.reader
            ? { ...m, isDelivered: true, dateRead: data.dateRead }
            : m
        )
      );
    });

    this.hubConnection.onclose(() => this.connectionEstablished.set(false));
  }

  stopHubConnection() {
    this.hubConnection?.stop().catch(error => console.log(error));
    this.connectionEstablished.set(false);
    this.messageThread.set([]);
  }

  async sendMessage(recipientUsername: string, content: string) {
    if (this.hubConnection?.state !== 'Connected') {
      throw new Error('Cannot send message: Not connected to server.');
    }
    return this.hubConnection.invoke('SendMessage', recipientUsername, content);
  }
}
