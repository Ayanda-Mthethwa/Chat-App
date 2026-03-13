import { Component, OnInit, OnDestroy, inject, computed, effect, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PresenceService } from '../../../core/services/presence.service';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat-window.html',
  styleUrls: ['./chat-window.css']
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  chatService = inject(ChatService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private presenceService = inject(PresenceService);
  private toast = inject(ToastService);

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('messageThreadEl') messageThreadEl!: ElementRef<HTMLDivElement>;

  recipientUsername: string | null = null;
  newMessageContent = '';
  isInCall = signal(false);
  incomingCall = signal<{sender: string, data: any} | null>(null);
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private typingTimeout: any;
  private rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  allUsers = signal<User[]>([]);
  searchQuery = signal('');

  usersWithStatus = computed(() => {
    const presenceReady = this.presenceService.hubConnected();
    const onlineIds = this.presenceService.onlineUsers();
    const users = this.allUsers();
    const currentUsername = this.authService.currentUser()?.username;
    return users
      .filter(u => u.username !== currentUsername)
      .map(user => ({
        ...user,
        isOnline: presenceReady ? onlineIds.some(o => o.id === user.id) : user.isOnline
      }))
      .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.username.localeCompare(b.username));
  });

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return q
      ? this.usersWithStatus().filter(u => u.username.toLowerCase().includes(q))
      : this.usersWithStatus();
  });

  isRecipientTyping = computed(() => {
    const recipient = this.recipientUsername;
    if (!recipient) return false;
    return this.presenceService.typingUsers().includes(recipient);
  });

  isAdmin = computed(() => this.authService.currentUser()?.role === 'Admin');
  messageThread = this.chatService.messageThread;
  connectionEstablished = this.chatService.connectionEstablished;

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
      if (signal.data.type === 'offer') {
        if (!this.isInCall()) this.incomingCall.set(signal);
        return;
      }
      if (this.peerConnection && signal.sender === this.recipientUsername) {
        this.handleSignalData(signal.data);
      }
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.route.paramMap.subscribe(params => {
      this.recipientUsername = params.get('username');
      this.chatService.stopHubConnection();
      if (this.recipientUsername) this.chatService.createHubConnection(this.recipientUsername);
    });
  }

  loadUsers() {
    this.http.get<User[]>('http://localhost:5062/api/users').subscribe(users => this.allUsers.set(users));
  }

  ngOnDestroy(): void {
    this.chatService.stopHubConnection();
    this.endCall();
  }

  async sendMessage() {
    if (!this.recipientUsername || !this.connectionEstablished() || !this.newMessageContent.trim()) return;
    try {
      await this.chatService.sendMessage(this.recipientUsername, this.newMessageContent);
      this.newMessageContent = '';
      clearTimeout(this.typingTimeout);
      this.presenceService.userStoppedTyping(this.recipientUsername);
    } catch {
      this.toast.error('Failed to send message. Please try again.');
    }
  }

  onMessageInput() {
    if (this.recipientUsername) {
      this.presenceService.userTyping(this.recipientUsername);
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => this.presenceService.userStoppedTyping(this.recipientUsername!), 3000);
    }
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  selectUserToChat(username: string) { this.router.navigate(['/features/chat', username]); }

  async deleteUser(userId: number, event: Event) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this user?')) return;
    this.http.delete(`http://localhost:5062/api/admin/users/${userId}`).subscribe({
      next: () => { this.loadUsers(); this.toast.success('User deleted.'); },
      error: () => this.toast.error('Failed to delete user.')
    });
  }

  // ── Date helpers for separators ──
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

  private scrollToBottom() {
    if (this.messageThreadEl?.nativeElement) {
      this.messageThreadEl.nativeElement.scrollTop = this.messageThreadEl.nativeElement.scrollHeight;
    }
  }

  // ── WebRTC ──
  async startCall() {
    if (!this.recipientUsername) return;
    this.isInCall.set(true);
    await this.initializePeerConnection();
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    this.presenceService.sendSignal(this.recipientUsername, { type: 'offer', sdp: offer.sdp });
  }

  async acceptCall() {
    const call = this.incomingCall();
    if (!call) return;
    this.incomingCall.set(null);
    this.router.navigate(['/features/chat', call.sender]).then(async () => {
      this.isInCall.set(true);
      await this.initializePeerConnection();
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: call.data.sdp }));
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      if (this.recipientUsername) this.presenceService.sendSignal(this.recipientUsername, { type: 'answer', sdp: answer.sdp });
    });
  }

  rejectCall() { this.incomingCall.set(null); }

  endCall() {
    this.isInCall.set(false);
    this.localStream?.getTracks().forEach(t => t.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    if (this.recipientUsername) this.presenceService.sendSignal(this.recipientUsername, { type: 'hangup' });
  }

  private async initializePeerConnection() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setTimeout(() => {
      if (this.localVideo?.nativeElement) this.localVideo.nativeElement.srcObject = this.localStream;
    });
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);
    this.localStream.getTracks().forEach(t => this.peerConnection!.addTrack(t, this.localStream!));
    this.peerConnection.ontrack = e => {
      if (this.remoteVideo?.nativeElement) this.remoteVideo.nativeElement.srcObject = e.streams[0];
    };
    this.peerConnection.onicecandidate = e => {
      if (e.candidate && this.recipientUsername)
        this.presenceService.sendSignal(this.recipientUsername, { type: 'candidate', candidate: e.candidate });
    };
  }

  private async handleSignalData(data: any) {
    if (!this.peerConnection) return;
    if (data.type === 'answer')
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
    else if (data.type === 'candidate')
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    else if (data.type === 'hangup')
      this.endCall();
  }
}
