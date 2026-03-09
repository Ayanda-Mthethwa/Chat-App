using System;
using System.Collections.Generic;

namespace ChatSystem.API.Models
{
    public class Conversation
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public bool IsGroup { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Participant> Participants { get; set; } = new List<Participant>();
    }
}