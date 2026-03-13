using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Data;
using System.Linq;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;

namespace ChatSystem.API.Hubs
{
    [Authorize]
    public class PresenceHub : Hub
    {
        private readonly ApplicationDbContext _context;
        // Thread-safe dictionary to track online users in memory (Key: Username, Value: List of ConnectionIds)
        private static readonly ConcurrentDictionary<string, List<string>> _onlineUsers = 
            new ConcurrentDictionary<string, List<string>>();

        public PresenceHub(ApplicationDbContext context) => _context = context;

        public override async Task OnConnectedAsync()
        {
            var username = Context.User.Identity.Name;

            // 1. Add connection to the tracker
            bool isNewlyOnline = false;
            _onlineUsers.AddOrUpdate(username, 
                _ => { 
                    isNewlyOnline = true; 
                    return new List<string> { Context.ConnectionId }; 
                }, 
                (_, list) => { 
                    lock(list) list.Add(Context.ConnectionId); 
                    return list; 
                });

            // 2. Update DB and Broadcast ONLY if this is the first connection for this user
            if (isNewlyOnline)
            {
                var user = await _context.Users.FirstOrDefaultAsync(x => x.Username == username);
                if (user != null)
                {
                    user.IsOnline = true;
                    await _context.SaveChangesAsync();
                    await Clients.Others.SendAsync("UserIsOnline", new { id = user.Id, username = user.Username });
                }
            }
            
            // 3. Send the current list of online users to the caller (fetched from DB based on Tracker keys)
            var currentOnlineUsernames = _onlineUsers.Keys.ToArray();
            var onlineUsers = await _context.Users
                .Where(u => currentOnlineUsernames.Contains(u.Username))
                .Select(u => new { id = u.Id, username = u.Username })
                .ToArrayAsync();
            
            await Clients.Caller.SendAsync("GetOnlineUsers", onlineUsers);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var username = Context.User.Identity.Name;
            bool isOffline = false;

            // 1. Remove connection from tracker
            if (_onlineUsers.TryGetValue(username, out var connections))
            {
                lock (connections)
                {
                    connections.Remove(Context.ConnectionId);
                    if (connections.Count == 0)
                    {
                        _onlineUsers.TryRemove(username, out _);
                        isOffline = true;
                    }
                }
            }

            // 2. If no connections remain, mark as offline in DB and notify others
            if (isOffline)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (user != null)
                {
                    user.IsOnline = false;
                    user.LastSeen = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await Clients.All.SendAsync("UserIsOffline", user.Id.ToString());
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendSignal(string toUsername, object signalData)
        {
            var sender = Context.User.Identity.Name;
            
            // Send to all active connections of the target user (handles multiple tabs/devices)
            if (_onlineUsers.TryGetValue(toUsername, out var connections))
            {
                await Clients.Clients(connections).SendAsync("NewSignal", sender, signalData);
            }
        }

        public async Task UserTyping(string toUsername)
        {
            if (_onlineUsers.TryGetValue(toUsername, out var connections))
            {
                var sender = Context.User.Identity.Name;
                await Clients.Clients(connections).SendAsync("UserIsTyping", sender);
            }
        }

        public async Task UserStoppedTyping(string toUsername)
        {
            if (_onlineUsers.TryGetValue(toUsername, out var connections))
            {
                var sender = Context.User.Identity.Name;
                await Clients.Clients(connections).SendAsync("UserStoppedTyping", sender);
            }
        }

    }
}