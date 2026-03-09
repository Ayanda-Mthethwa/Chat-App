using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Data;
using ChatSystem.API.Models;

namespace ChatSystem.API.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;
        public ChatHub(ApplicationDbContext context) => _context = context;

        public async Task SendMessage(string recipientUsername, string content)
        {
            var senderUsername = Context.User?.Identity?.Name;
            if (string.IsNullOrEmpty(senderUsername)) return;

            var message = new Message
            {
                SenderUsername = senderUsername,
                RecipientUsername = recipientUsername,
                Content = content,
                MessageSent = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var groupName = GetGroupName(senderUsername, recipientUsername);
            await Clients.Group(groupName).SendAsync("NewMessage", message);
        }

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            var otherUser = httpContext.Request?.Query["user"].ToString();
            var username = Context.User?.Identity?.Name;

            // If we don't have both names, we can't build a chat room
            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(otherUser)) return;

            var groupName = GetGroupName(username, otherUser);
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            var messages = await _context.Messages
                .Where(m => (m.SenderUsername == username && m.RecipientUsername == otherUser)
                         || (m.SenderUsername == otherUser && m.RecipientUsername == username))
                .OrderBy(m => m.MessageSent)
                .ToListAsync();

            await Clients.Caller.SendAsync("ReceiveMessageThread", messages);
        }

        private string GetGroupName(string caller, string other)
        {
            // The stringCompare ensures UserA-UserB is the same room as UserB-UserA
            var stringCompare = string.CompareOrdinal(caller, other) < 0;
            return stringCompare ? $"{caller}-{other}" : $"{other}-{caller}";
        }
    }
}