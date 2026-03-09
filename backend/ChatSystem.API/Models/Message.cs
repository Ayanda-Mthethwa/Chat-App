using System;

namespace ChatSystem.API.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string SenderUsername { get; set; } = string.Empty;
        public string RecipientUsername { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime MessageSent { get; set; } = DateTime.UtcNow;
        public DateTime? DateRead { get; set; }
    }
}