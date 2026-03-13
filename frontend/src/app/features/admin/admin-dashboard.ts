import { Component, OnInit, OnDestroy, inject, computed, effect, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminService } from '../../core/services/admin.service';
import { ChatService } from '../../core/services/chat.service';
import { PresenceService } from '../../core/services/presence.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/user.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  adminService = inject(AdminService);
  chatService = inject(ChatService);
  presenceService = inject(PresenceService);
  authService = inject(AuthService);

  selectedUser: User | null = null;
  newMessageContent = '';

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('messageThreadEl') messageThreadEl!: ElementRef<HTMLDivElement>;

  isInCall = signal(false);
  incomingCall = signal<{sender: string, data: any} | null>(null);
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private typingTimeout: any;
  
  private rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };
  private allUsers = toSignal(this.adminService.getAllUsers(), { initialValue: [] as User[] });

  searchQuery = signal('');

  usersWithStatus = computed(() => {
    const onlineIds = this.presenceService.onlineUsers();
    const users = this.allUsers();
    const currentUsername = this.authService.currentUser()?.username;

    return users
      .filter(u => u.username !== currentUsername)
      .map(user => ({
        ...user,
        isOnline: onlineIds.some(onlineUser => onlineUser.id === user.id)
      }))
      .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.username.localeCompare(b.username));
  });

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.usersWithStatus();
    return this.usersWithStatus().filter(u => u.username.toLowerCase().includes(q));
  });

  messageThread = this.chatService.messageThread;
  connectionEstablished = this.chatService.connectionEstablished;

  isRecipientTyping = computed(() => {
    const username = this.selectedUser?.username;
    if (!username) return false;
    return this.presenceService.typingUsers().includes(username);
  });

  constructor() {
    // Auto-scroll on new messages
    effect(() => {
      const msgs = this.messageThread();
      if (msgs.length) { setTimeout(() => this.scrollToBottom(), 50); }
    });

    // WebRTC signals
    effect(() => {
      const signal = this.presenceService.signalReceived();
      if (!signal) return;

      if (signal.sender === this.selectedUser?.username) {
        if (signal.data.type === 'offer') {
          this.incomingCall.set(signal);
        } else if (this.peerConnection) {
          this.handleSignalData(signal.data);
        }
      }
    });
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onMessageInput(): void {
    const username = this.selectedUser?.username;
    if (username) {
      this.presenceService.userTyping(username);
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => this.presenceService.userStoppedTyping(username), 3000);
    }
  }

  isNewDay(messages: { messageSent: any }[], index: number): boolean {
    if (index === 0) return true;
    return new Date(messages[index].messageSent).toDateString()
        !== new Date(messages[index - 1].messageSent).toDateString();
  }

  getDateLabel(date: any): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  private scrollToBottom(): void {
    if (this.messageThreadEl?.nativeElement) {
      this.messageThreadEl.nativeElement.scrollTop = this.messageThreadEl.nativeElement.scrollHeight;
    }
  }

  ngOnInit(): void { }

  ngOnDestroy(): void {
    this.chatService.stopHubConnection();
    this.endCall();
  }

  selectUserToChat(user: User) {
    this.selectedUser = user;
    this.chatService.stopHubConnection();
    this.chatService.createHubConnection(user.username);
  }

  userToDelete = signal<{ id: number; username: string } | null>(null);

  deleteUser(user: { id: number; username: string }, event: Event) {
    event.stopPropagation();
    this.userToDelete.set(user);
  }

  confirmDelete() {
    const user = this.userToDelete();
    if (!user) return;
    this.userToDelete.set(null);
    this.http.delete(`http://localhost:5062/api/admin/users/${user.id}`).subscribe({
      next: () => {
        if (this.selectedUser?.id === user.id) {
          this.selectedUser = null;
          this.chatService.stopHubConnection();
        }
        this.toast.success('User deleted.');
      },
      error: () => this.toast.error('Failed to delete user.')
    });
  }

  cancelDelete() {
    this.userToDelete.set(null);
  }

  async sendMessage() {
    if (!this.selectedUser || !this.connectionEstablished() || !this.newMessageContent.trim()) {
      return;
    }

    try {
      await this.chatService.sendMessage(this.selectedUser.username, this.newMessageContent);
      this.newMessageContent = '';
    } catch (error) {
      console.error("Failed to send message", error);
    }
  }

  // --- WebRTC Logic ---
  async startCall() {
    if (!this.selectedUser?.username) return;
    this.isInCall.set(true);
    await this.initializePeerConnection();
    
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    
    this.presenceService.sendSignal(this.selectedUser.username, { type: 'offer', sdp: offer.sdp });
  }

  async acceptCall() {
    if (!this.incomingCall() || !this.selectedUser?.username) return;
    const offer = this.incomingCall()!.data;
    this.incomingCall.set(null);
    this.isInCall.set(true);

    await this.initializePeerConnection();
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer.sdp }));
    
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    
    this.presenceService.sendSignal(this.selectedUser.username, { type: 'answer', sdp: answer.sdp });
  }

  rejectCall() {
    this.incomingCall.set(null);
    // Optionally send a reject signal
  }

  endCall() {
    this.isInCall.set(false);
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    
    if (this.selectedUser?.username) {
      this.presenceService.sendSignal(this.selectedUser.username, { type: 'hangup' });
    }
  }

  private async initializePeerConnection() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    setTimeout(() => {
      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = this.localStream;
      }
    });

    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    this.peerConnection.ontrack = (event) => {
      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.selectedUser?.username) {
        this.presenceService.sendSignal(this.selectedUser.username, { 
          type: 'candidate', 
          candidate: event.candidate 
        });
      }
    };
  }

  private async handleSignalData(data: any) {
    if (!this.peerConnection) return;

    if (data.type === 'answer') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
    } 
    else if (data.type === 'candidate') {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
    else if (data.type === 'hangup') {
      this.endCall();
    }
  }
}