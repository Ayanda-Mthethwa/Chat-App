using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Data;
using ChatSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Concurrent;

namespace ChatSystem.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;

        // Tracks which usernames are currently in each group (groupName -> set of usernames)
        private static readonly ConcurrentDictionary<string, HashSet<string>> _groupMembers = new();

        public ChatHub(ApplicationDbContext context) => _context = context;

        public async Task SendMessage(string recipientUsername, string content)
        {
            var senderUsername = Context.User?.Identity?.Name;
            if (string.IsNullOrEmpty(senderUsername)) return;

            var groupName = GetGroupName(senderUsername, recipientUsername);

            // If recipient is currently viewing this chat, mark as read immediately
            bool recipientInGroup = _groupMembers.TryGetValue(groupName, out var members)
                && members.Contains(recipientUsername);

            var now = DateTime.UtcNow;
            var message = new Message
            {
                SenderUsername = senderUsername,
                RecipientUsername = recipientUsername,
                Content = content,
                MessageSent = now,
                DateRead = recipientInGroup ? now : null
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var messageDto = new
            {
                id = message.Id,
                senderUsername = message.SenderUsername,
                recipientUsername = message.RecipientUsername,
                content = message.Content,
                messageSent = message.MessageSent,
                isDelivered = recipientInGroup,
                dateRead = message.DateRead.HasValue
                    ? DateTime.SpecifyKind(message.DateRead.Value, DateTimeKind.Utc)
                    : (DateTime?)null
            };

            await Clients.Group(groupName).SendAsync("NewMessage", messageDto);
        }

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            var otherUser = httpContext?.Request?.Query["user"].ToString();
            var username = Context.User?.Identity?.Name;

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(otherUser)) return;

            var groupName = GetGroupName(username, otherUser);
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            // Track this user as a member of this group
            _groupMembers.AddOrUpdate(
                groupName,
                new HashSet<string> { username },
                (_, existing) => { lock (existing) { existing.Add(username); } return existing; });

            var now = DateTime.UtcNow;

            // Mark all unread messages from otherUser to username as read
            var unreadMessages = await _context.Messages
                .Where(m => m.SenderUsername == otherUser
                         && m.RecipientUsername == username
                         && m.DateRead == null)
                .ToListAsync();

            if (unreadMessages.Any())
            {
                foreach (var msg in unreadMessages)
                    msg.DateRead = now;

                await _context.SaveChangesAsync();

                // Notify sender that their messages have been read
                await Clients.Group(groupName).SendAsync("MessagesRead", new
                {
                    reader = username,
                    dateRead = now
                });
            }

            // Send the full message thread to the caller
            var messages = await _context.Messages
                .Where(m => (m.SenderUsername == username && m.RecipientUsername == otherUser)
                         || (m.SenderUsername == otherUser && m.RecipientUsername == username))
                .OrderBy(m => m.MessageSent)
                .Select(m => new
                {
                    id = m.Id,
                    senderUsername = m.SenderUsername,
                    recipientUsername = m.RecipientUsername,
                    content = m.Content,
                    messageSent = DateTime.SpecifyKind(m.MessageSent, DateTimeKind.Utc),
                    isDelivered = m.DateRead.HasValue,
                    dateRead = m.DateRead.HasValue
                        ? DateTime.SpecifyKind(m.DateRead.Value, DateTimeKind.Utc)
                        : (DateTime?)null
                })
                .ToListAsync();

            await Clients.Caller.SendAsync("ReceiveMessageThread", messages);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var username = Context.User?.Identity?.Name;
            var httpContext = Context.GetHttpContext();
            var otherUser = httpContext?.Request?.Query["user"].ToString();

            if (!string.IsNullOrEmpty(username) && !string.IsNullOrEmpty(otherUser))
            {
                var groupName = GetGroupName(username, otherUser);
                if (_groupMembers.TryGetValue(groupName, out var members))
                {
                    lock (members) { members.Remove(username); }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        private string GetGroupName(string caller, string other)
        {
            var stringCompare = string.CompareOrdinal(caller, other) < 0;
            return stringCompare ? $"{caller}-{other}" : $"{other}-{caller}";
        }
    }
}
