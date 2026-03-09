using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Data;

namespace ChatSystem.API.Hubs
{
    public class PresenceHub : Hub
    {
        private readonly ApplicationDbContext _context;
        public PresenceHub(ApplicationDbContext context) => _context = context;

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId(); // Logic to get ID from JWT
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

            if (user != null)
            {
                user.IsOnline = true;
                user.ConnectionId = Context.ConnectionId;
                await _context.SaveChangesAsync();

                // Notify EVERYONE that this user is now online
                await Clients.All.SendAsync("UserIsOnline", userId);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.ConnectionId == Context.ConnectionId);

            if (user != null)
            {
                user.IsOnline = false;
                user.LastSeen = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Notify EVERYONE that this user went offline
                await Clients.All.SendAsync("UserIsOffline", user.Id);
            }

            await base.OnDisconnectedAsync(exception);
        }

        private int GetUserId() { 
            // This pulls the ID from the NameIdentifier claim in your JWT
            return int.Parse(Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        }
    }
}