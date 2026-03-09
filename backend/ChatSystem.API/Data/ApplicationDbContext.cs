using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Models;

namespace ChatSystem.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<Participant> Participants { get; set; }
        public DbSet<Message> Messages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Define the Many-to-Many relationship for Participants
            modelBuilder.Entity<Participant>()
                .HasKey(p => new { p.UserId, p.ConversationId });

            // Ensure Messages are indexed by ConversationId for speed
            modelBuilder.Entity<Message>()
                .HasIndex(m => new { m.SenderUsername, m.RecipientUsername });
        }
    }
}