import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { PresenceService } from './core/services/presence.service';

describe('App', () => {
  const mockAuthService = {
    currentUser: signal<any>(null),
    logout: vi.fn(),
  };

  const mockPresenceService = {
    onlineUsers: signal<any[]>([]),
    hubConnected: signal(false),
    signalReceived: signal<any>(null),
    typingUsers: signal<string[]>([]),
    createHubConnection: vi.fn(),
    stopHubConnection: vi.fn(),
    userTyping: vi.fn(),
    userStoppedTyping: vi.fn(),
    sendSignal: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService,     useValue: mockAuthService },
        { provide: PresenceService, useValue: mockPresenceService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should contain a router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
