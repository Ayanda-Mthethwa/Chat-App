using System;
using System.Collections.Generic;

namespace ChatSystem.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Member"; 
        public bool IsOnline { get; set; }
        public DateTime LastSeen { get; set; } = DateTime.UtcNow;
        public string? ConnectionId { get; set; }

        public string? AvatarUrl { get; set; }
        
        public ICollection<Participant> Participants { get; set; } = new List<Participant>();
    }
}
