using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Data;
using ChatSystem.API.Models;
using ChatSystem.API.Dtos;
using ChatSystem.API.Services;

namespace ChatSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AccountController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<ActionResult<User>> Register(RegisterDto registerDto)
        {
            if (await _context.Users.AnyAsync(x => x.Username == registerDto.Username.ToLower()))
                return BadRequest("Username is taken");

            var user = new User
            {
                Username = registerDto.Username.ToLower(),
                Role = registerDto.Role,
                // HASH THE PASSWORD HERE
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                Email = registerDto.Email // Added this as it's in your MySQL table
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(user);
        }

        [HttpPost("login")]
        public async Task<ActionResult<object>> Login(LoginDto loginDto, [FromServices] TokenService tokenService)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Username == loginDto.Username.ToLower());

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                return Unauthorized("Invalid credentials");

            return Ok(new
            {
                username = user.Username,
                role = user.Role,
                token = tokenService.CreateToken(user) // Send the signed token!
            });
        }
    }
}