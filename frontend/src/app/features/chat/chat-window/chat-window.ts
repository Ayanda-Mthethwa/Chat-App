import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.html',
  styleUrls: ['./chat-window.css']
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  chatService = inject(ChatService);
  authService = inject(AuthService);
  
  // For now, hardcode a recipient or get it from a route param later
  recipientUsername = 'Admin'; 
  newMessageContent = '';

  ngOnInit(): void {
    // Start the SignalR connection for this specific chat
    this.chatService.createHubConnection(this.recipientUsername);
  }

  ngOnDestroy(): void {
    // Crucial: Stop connection so you don't leak memory or stay in groups
    this.chatService.stopHubConnection();
  }

  sendMessage() {
    if (!this.newMessageContent.trim()) return;

    this.chatService.sendMessage(this.recipientUsername, this.newMessageContent)
      .then(() => {
        this.newMessageContent = ''; // Clear input after sending
      });
  }
}