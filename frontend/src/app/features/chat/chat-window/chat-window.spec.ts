import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { Subject } from 'rxjs';
import { ParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ChatWindowComponent } from './chat-window';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { PresenceService } from '../../../core/services/presence.service';
import { ToastService } from '../../../core/services/toast.service';

describe('ChatWindowComponent', () => {
  let component: ChatWindowComponent;
  let fixture: ComponentFixture<ChatWindowComponent>;

  const paramMapSubject = new Subject<ParamMap>();

  const mockChatService = {
    messageThread: signal<any[]>([]),
    connectionEstablished: signal(false),
    createHubConnection: vi.fn(),
    stopHubConnection: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  };

  const mockAuthService = {
    currentUser: signal<any>(null),
    logout: vi.fn(),
  };

  const mockPresenceService = {
    onlineUsers: signal<any[]>([]),
    hubConnected: signal(false),
    signalReceived: signal<any>(null),
    typingUsers: signal<string[]>([]),
    userTyping: vi.fn(),
    userStoppedTyping: vi.fn(),
    sendSignal: vi.fn(),
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatWindowComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ChatService,     useValue: mockChatService },
        { provide: AuthService,     useValue: mockAuthService },
        { provide: PresenceService, useValue: mockPresenceService },
        { provide: ToastService,    useValue: mockToastService },
        { provide: ActivatedRoute,  useValue: { paramMap: paramMapSubject.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatWindowComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not send a message when content is empty', async () => {
    component.newMessageContent = '   ';
    await component.sendMessage();
    expect(mockChatService.sendMessage).not.toHaveBeenCalled();
  });

  it('should not send a message when connection is not established', async () => {
    component.recipientUsername = 'alice';
    component.newMessageContent = 'Hello';
    mockChatService.connectionEstablished.set(false);
    await component.sendMessage();
    expect(mockChatService.sendMessage).not.toHaveBeenCalled();
  });

  it('isNewDay should return true for the first message', () => {
    const messages = [{ messageSent: new Date() }];
    expect(component.isNewDay(messages, 0)).toBe(true);
  });

  it('getDateLabel should return "Today" for the current date', () => {
    expect(component.getDateLabel(new Date())).toBe('Today');
  });
});
