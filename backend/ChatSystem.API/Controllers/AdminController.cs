using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Data;
using ChatSystem.API.Models;

namespace ChatSystem.API.Controllers
{
    [Authorize(Roles = "Admin")] // Only users with 'Admin' in their JWT can enter
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdminController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            // We return a projection so we don't send Password Hashes over the network
            var users = await _context.Users
                .Select(u => new {
                    u.Id,
                    u.Username,
                    u.Role,
                    u.IsOnline,
                    u.LastSeen,
                    u.AvatarUrl
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            if (user.Role == "Admin") return BadRequest("You cannot delete an admin");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}