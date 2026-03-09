using System;

namespace ChatSystem.API.Models
{
    public class Participant
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}