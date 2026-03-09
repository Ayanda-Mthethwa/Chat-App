using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChatSystem.API.Models;
using Microsoft.IdentityModel.Tokens;

namespace ChatSystem.API.Services
{
    public class TokenService
    {
        private readonly SymmetricSecurityKey _key;

        public TokenService(IConfiguration config)
        {
            // This looks for "TokenKey" in your appsettings.json
            var tokenKey = config["TokenKey"];
            
            if (string.IsNullOrEmpty(tokenKey))
                throw new Exception("TokenKey not found in appsettings.json");

            _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
        }

        public string CreateToken(User user)
        {
            // 1. Define what info (Claims) we want to stay inside the token
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.NameId, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(ClaimTypes.Role, user.Role) // Vital for [Authorize(Roles = "Admin")]
            };

            // 2. Define the security level (Encryption algorithm)
            var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha512Signature);

            // 3. Create the "Envelope" for the token
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.Now.AddDays(7), // Token valid for 1 week
                SigningCredentials = creds
            };

            // 4. Generate the actual token string
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}